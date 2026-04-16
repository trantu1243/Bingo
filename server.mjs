import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Game state
let players = [];
let currentGame = {
  id: null,
  status: 'waiting', // waiting, setup, countdown, playing, ended
  calledNumbers: [],
  currentNumber: null,
  countdown: null,
  winnerId: null,
  maxPlayers: 20,
  startedAt: null,
  endedAt: null,
  setupEndTime: null,
  adminSelectedNumbers: [],
  numberQueue: [],
  numberCountdown: null,
};

// File paths for persistence
const PLAYERS_FILE = './data/players.json';
const GAME_FILE = './data/game.json';

// Helper functions
function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

function generateAvatarColor() {
  const colors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function saveState() {
  try {
    if (!existsSync('./data')) {
      writeFileSync('./data/.gitkeep', '');
    }
    writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2));
    writeFileSync(GAME_FILE, JSON.stringify(currentGame, null, 2));
  } catch (error) {
    console.error('Error saving state:', error);
  }
}

function loadState() {
  try {
    if (existsSync(PLAYERS_FILE)) {
      players = JSON.parse(readFileSync(PLAYERS_FILE, 'utf-8'));
      // Mark all players as offline on server restart
      players = players.map(p => ({ ...p, isOnline: false, socketId: null }));
    }
    if (existsSync(GAME_FILE)) {
      currentGame = JSON.parse(readFileSync(GAME_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('Error loading state:', error);
  }
}

function calculateBingoLines(board, markedNumbers, missedNumbers = []) {
  if (!board || board.length !== 25) return 0;
  
  const marked = new Set(markedNumbers);
  const missed = new Set(missedNumbers);
  let lines = 0;
  
  // Check rows - a line cannot be completed if any cell is missed
  for (let row = 0; row < 5; row++) {
    let complete = true;
    let hasMissed = false;
    for (let col = 0; col < 5; col++) {
      const num = board[row * 5 + col];
      if (missed.has(num)) {
        hasMissed = true;
        break;
      }
      if (!marked.has(num)) {
        complete = false;
      }
    }
    if (!hasMissed && complete) lines++;
  }
  
  // Check columns
  for (let col = 0; col < 5; col++) {
    let complete = true;
    let hasMissed = false;
    for (let row = 0; row < 5; row++) {
      const num = board[row * 5 + col];
      if (missed.has(num)) {
        hasMissed = true;
        break;
      }
      if (!marked.has(num)) {
        complete = false;
      }
    }
    if (!hasMissed && complete) lines++;
  }
  
  // Check diagonals
  let diag1Complete = true;
  let diag1Missed = false;
  let diag2Complete = true;
  let diag2Missed = false;
  
  for (let i = 0; i < 5; i++) {
    const num1 = board[i * 5 + i];
    const num2 = board[i * 5 + (4 - i)];
    
    if (missed.has(num1)) diag1Missed = true;
    if (!marked.has(num1)) diag1Complete = false;
    
    if (missed.has(num2)) diag2Missed = true;
    if (!marked.has(num2)) diag2Complete = false;
  }
  
  if (!diag1Missed && diag1Complete) lines++;
  if (!diag2Missed && diag2Complete) lines++;
  
  return lines;
}

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function generateRandomBoard() {
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
  return shuffleArray(numbers);
}

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Load saved state
  loadState();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join game
    socket.on('join_game', ({ nickname }) => {
      if (!nickname || nickname.trim().length === 0) {
        socket.emit('error', { message: 'Nickname is required' });
        return;
      }

      if (nickname.length > 20) {
        socket.emit('error', { message: 'Nickname must be 20 characters or less' });
        return;
      }

      // Check if nickname is already taken by another online player
      const existingPlayer = players.find(p => p.nickname.toLowerCase() === nickname.toLowerCase() && p.isOnline);
      if (existingPlayer) {
        socket.emit('error', { message: 'Nickname is already taken' });
        return;
      }

      // Check if player already exists (reconnection)
      let player = players.find(p => p.nickname.toLowerCase() === nickname.toLowerCase());
      
      if (player) {
        // Reconnect existing player
        player.socketId = socket.id;
        player.isOnline = true;
      } else {
        // Check max players
        if (players.length >= currentGame.maxPlayers) {
          socket.emit('error', { message: 'Game is full' });
          return;
        }

        // Create new player
        player = {
          id: generateId(),
          nickname: nickname.trim(),
          socketId: socket.id,
          boardNumbers: [],
          markedNumbers: [],
          missedNumbers: [], // Numbers player failed to mark in time
          bingoLines: 0,
          isReady: false,
          isBoardLocked: false,
          isOnline: true,
          joinedAt: Date.now(),
          avatarColor: generateAvatarColor(),
        };
        players.push(player);
      }

      saveState();

      socket.emit('join_success', { player, gameStatus: currentGame.status, game: currentGame });
      io.emit('player_joined', { player });
      io.emit('waiting_room_update', { players, game: currentGame });
    });

    // Reconnect player
    socket.on('reconnect_player', ({ nickname }) => {
      const player = players.find(p => p.nickname.toLowerCase() === nickname.toLowerCase());
      if (player) {
        player.socketId = socket.id;
        player.isOnline = true;
        saveState();
        socket.emit('reconnect_success', { player, gameStatus: currentGame.status, game: currentGame });
        io.emit('waiting_room_update', { players, game: currentGame });
      } else {
        socket.emit('reconnect_failed');
      }
    });

    // Submit board
    socket.on('submit_board', ({ playerId, board }) => {
      const player = players.find(p => p.id === playerId);
      if (player && board && board.length === 25) {
        player.boardNumbers = board;
        player.isBoardLocked = true;
        player.isReady = true;
        saveState();
        socket.emit('board_locked', { player });
        io.emit('waiting_room_update', { players, game: currentGame });
      }
    });

    // Update board position (during setup)
    socket.on('update_board_position', ({ playerId, board }) => {
      const player = players.find(p => p.id === playerId);
      if (player && !player.isBoardLocked && currentGame.status === 'setup') {
        player.boardNumbers = board;
        saveState();
      }
    });

    // Mark number
    socket.on('mark_number', ({ playerId, number }) => {
      const player = players.find(p => p.id === playerId);
      if (player && currentGame.status === 'playing') {
        // Check if number is in called numbers
        if (currentGame.calledNumbers.includes(number)) {
          // Check if number is already marked or missed
          if (player.markedNumbers.includes(number)) {
            return; // Already marked
          }
          if (player.missedNumbers && player.missedNumbers.includes(number)) {
            socket.emit('error', { message: 'This number is disabled - you missed the time window!' });
            return; // Missed - cannot mark
          }
          
          // Check if this is the current number (within countdown) or a past number that wasn't missed
          // Only the current number can be marked during countdown
          if (currentGame.currentNumber !== number) {
            // This is a past number - check if it was missed
            socket.emit('error', { message: 'Time is up for this number!' });
            return;
          }
          
          player.markedNumbers.push(number);
          player.bingoLines = calculateBingoLines(player.boardNumbers, player.markedNumbers, player.missedNumbers || []);
          saveState();
          
          socket.emit('mark_success', { player });
          io.emit('player_bingo_update', { 
            playerId: player.id, 
            bingoLines: player.bingoLines,
            markedNumbers: player.markedNumbers
          });

          if (player.bingoLines >= 3) {
            socket.emit('bingo_available');
          }
        }
      }
    });

    // Press Bingo
    socket.on('press_bingo', ({ playerId }) => {
      const player = players.find(p => p.id === playerId);
      if (player && currentGame.status === 'playing') {
        // Verify 3 lines (accounting for missed numbers)
        const actualLines = calculateBingoLines(player.boardNumbers, player.markedNumbers, player.missedNumbers || []);
        if (actualLines >= 3 && !currentGame.winnerId) {
          currentGame.winnerId = player.id;
          currentGame.status = 'ended';
          currentGame.endedAt = Date.now();
          saveState();

          io.emit('winner_announced', { 
            winner: player, 
            bingoLines: actualLines 
          });
          io.emit('game_ended', { winner: player });
        } else {
          socket.emit('bingo_invalid', { message: 'Not enough lines for Bingo' });
        }
      }
    });

    // Admin: Start game (setup phase)
    socket.on('admin_start_game', () => {
      if (currentGame.status === 'waiting' && players.length >= 1) {
        currentGame.status = 'setup';
        currentGame.id = generateId();
        currentGame.startedAt = Date.now();
        currentGame.setupEndTime = Date.now() + 180000; // 3 minutes
        currentGame.calledNumbers = [];
        currentGame.currentNumber = null;
        currentGame.winnerId = null;
        currentGame.adminSelectedNumbers = [];
        currentGame.numberQueue = [];
        
        // Reset all players
        players.forEach(p => {
          p.boardNumbers = [];
          p.markedNumbers = [];
          p.missedNumbers = [];
          p.bingoLines = 0;
          p.isReady = false;
          p.isBoardLocked = false;
        });
        
        saveState();
        io.emit('game_started', { game: currentGame });
        io.emit('waiting_room_update', { players, game: currentGame });
      }
    });

    // Admin: Force start
    socket.on('admin_force_start', () => {
      if (currentGame.status === 'waiting' && players.length >= 1) {
        currentGame.status = 'setup';
        currentGame.id = generateId();
        currentGame.startedAt = Date.now();
        currentGame.setupEndTime = Date.now() + 180000;
        currentGame.calledNumbers = [];
        currentGame.currentNumber = null;
        currentGame.winnerId = null;
        currentGame.adminSelectedNumbers = [];
        currentGame.numberQueue = [];
        
        players.forEach(p => {
          p.boardNumbers = [];
          p.markedNumbers = [];
          p.missedNumbers = [];
          p.bingoLines = 0;
          p.isReady = false;
          p.isBoardLocked = false;
        });
        
        saveState();
        io.emit('game_started', { game: currentGame });
        io.emit('waiting_room_update', { players, game: currentGame });
      }
    });

    // Admin: Start countdown (after setup)
    socket.on('admin_start_countdown', () => {
      if (currentGame.status === 'setup') {
        // Lock all boards and generate random for those not set
        players.forEach(p => {
          if (!p.boardNumbers || p.boardNumbers.length !== 25) {
            p.boardNumbers = generateRandomBoard();
          }
          p.isBoardLocked = true;
          p.isReady = true;
        });
        
        currentGame.status = 'countdown';
        saveState();
        
        io.emit('countdown_started');
        io.emit('waiting_room_update', { players, game: currentGame });

        // Start countdown 3-2-1-GO
        let count = 3;
        const countdownInterval = setInterval(() => {
          io.emit('countdown_tick', { count });
          count--;
          if (count < 0) {
            clearInterval(countdownInterval);
            currentGame.status = 'playing';
            saveState();
            io.emit('game_playing', { game: currentGame });
          }
        }, 1000);
      }
    });

    // Admin: Select number
    socket.on('admin_select_number', ({ number }) => {
      if (currentGame.status === 'playing' && !currentGame.calledNumbers.includes(number)) {
        currentGame.numberQueue.push(number);
        
        // If no current number being displayed, start the display
        if (!currentGame.currentNumber) {
          displayNextNumber(io);
        }
        
        saveState();
      }
    });

    // Admin: Random number
    socket.on('admin_random_number', () => {
      if (currentGame.status === 'playing') {
        const availableNumbers = [];
        for (let i = 1; i <= 25; i++) {
          if (!currentGame.calledNumbers.includes(i) && !currentGame.numberQueue.includes(i)) {
            availableNumbers.push(i);
          }
        }
        
        if (availableNumbers.length > 0) {
          const randomNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
          currentGame.numberQueue.push(randomNumber);
          
          if (!currentGame.currentNumber) {
            displayNextNumber(io);
          }
          
          saveState();
        }
      }
    });

    // Admin: End game
    socket.on('admin_end_game', () => {
      currentGame.status = 'ended';
      currentGame.endedAt = Date.now();
      saveState();
      io.emit('game_ended', { winner: null });
    });

    // Admin: Reset game
    socket.on('admin_reset_game', () => {
      currentGame = {
        id: null,
        status: 'waiting',
        calledNumbers: [],
        currentNumber: null,
        countdown: null,
        winnerId: null,
        maxPlayers: 20,
        startedAt: null,
        endedAt: null,
        setupEndTime: null,
        adminSelectedNumbers: [],
        numberQueue: [],
        numberCountdown: null,
      };
      
      players.forEach(p => {
        p.boardNumbers = [];
        p.markedNumbers = [];
        p.missedNumbers = [];
        p.bingoLines = 0;
        p.isReady = false;
        p.isBoardLocked = false;
      });
      
      saveState();
      io.emit('game_reset', { game: currentGame });
      io.emit('waiting_room_update', { players, game: currentGame });
    });

    // Admin: Kick player
    socket.on('admin_kick_player', ({ playerId }) => {
      const playerIndex = players.findIndex(p => p.id === playerId);
      if (playerIndex !== -1) {
        const player = players[playerIndex];
        players.splice(playerIndex, 1);
        saveState();
        
        if (player.socketId) {
          io.to(player.socketId).emit('kicked');
        }
        
        io.emit('player_left', { playerId: player.id });
        io.emit('waiting_room_update', { players, game: currentGame });
      }
    });

    // Get game state
    socket.on('get_game_state', () => {
      socket.emit('game_state', { players, game: currentGame });
    });

    // Disconnect
    socket.on('disconnect', () => {
      const player = players.find(p => p.socketId === socket.id);
      if (player) {
        player.isOnline = false;
        player.socketId = null;
        saveState();
        io.emit('player_left', { playerId: player.id });
        io.emit('waiting_room_update', { players, game: currentGame });
      }
      console.log('Client disconnected:', socket.id);
    });
  });

  // Function to display next number with 5 second countdown
  function displayNextNumber(io) {
    if (currentGame.numberQueue.length === 0 || currentGame.status !== 'playing') {
      currentGame.currentNumber = null;
      return;
    }

    const number = currentGame.numberQueue.shift();
    currentGame.currentNumber = number;
    currentGame.calledNumbers.push(number);
    currentGame.numberCountdown = 5;
    saveState();

    io.emit('new_called_number', { 
      number, 
      countdown: 5,
      calledNumbers: currentGame.calledNumbers 
    });

    let countdown = 5;
    const countdownInterval = setInterval(() => {
      countdown--;
      currentGame.numberCountdown = countdown;
      io.emit('number_countdown', { countdown, number });
      
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        
        // Mark number as missed for players who didn't mark it in time
        // Only if the number is on their board
        players.forEach(player => {
          if (player.boardNumbers.includes(number) && 
              !player.markedNumbers.includes(number) &&
              (!player.missedNumbers || !player.missedNumbers.includes(number))) {
            // Initialize missedNumbers if not exists
            if (!player.missedNumbers) {
              player.missedNumbers = [];
            }
            player.missedNumbers.push(number);
            // Recalculate bingo lines (some lines may now be impossible)
            player.bingoLines = calculateBingoLines(player.boardNumbers, player.markedNumbers, player.missedNumbers);
            
            // Notify the specific player that they missed the number
            if (player.socketId) {
              io.to(player.socketId).emit('number_missed', { 
                number, 
                player: {
                  ...player,
                  missedNumbers: player.missedNumbers,
                  bingoLines: player.bingoLines
                }
              });
            }
          }
        });
        
        currentGame.currentNumber = null;
        currentGame.numberCountdown = null;
        saveState();
        
        // Emit updated player states to everyone
        io.emit('waiting_room_update', { players, game: currentGame });
        
        // Display next number if available
        if (currentGame.numberQueue.length > 0 && currentGame.status === 'playing') {
          setTimeout(() => displayNextNumber(io), 500);
        } else {
          io.emit('number_display_ended');
        }
      }
    }, 1000);
  }

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
