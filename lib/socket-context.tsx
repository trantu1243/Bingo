'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Player, Game, GameState } from './types';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  player: Player | null;
  players: Player[];
  game: Game;
  setPlayer: (player: Player | null) => void;
  joinGame: (nickname: string) => void;
  reconnectPlayer: (nickname: string) => void;
  submitBoard: (board: number[]) => void;
  updateBoardPosition: (board: number[]) => void;
  markNumber: (number: number) => void;
  pressBingo: () => void;
  error: string | null;
  clearError: () => void;
}

const defaultGame: Game = {
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

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [game, setGame] = useState<Game>(defaultGame);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socketInstance = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('[v0] Socket connected');
      setConnected(true);
      
      // Try to reconnect if we have a saved nickname
      const savedNickname = localStorage.getItem('bingo_nickname');
      if (savedNickname) {
        socketInstance.emit('reconnect_player', { nickname: savedNickname });
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('[v0] Socket disconnected');
      setConnected(false);
    });

    socketInstance.on('join_success', ({ player, game }: { player: Player; game: Game }) => {
      console.log('[v0] Join success:', player);
      setPlayer(player);
      setGame(game);
      localStorage.setItem('bingo_nickname', player.nickname);
    });

    socketInstance.on('reconnect_success', ({ player, game }: { player: Player; game: Game }) => {
      console.log('[v0] Reconnect success:', player);
      setPlayer(player);
      setGame(game);
    });

    socketInstance.on('reconnect_failed', () => {
      console.log('[v0] Reconnect failed');
      localStorage.removeItem('bingo_nickname');
    });

    socketInstance.on('error', ({ message }: { message: string }) => {
      console.log('[v0] Socket error:', message);
      setError(message);
    });

    socketInstance.on('player_joined', ({ player }: { player: Player }) => {
      console.log('[v0] Player joined:', player);
    });

    socketInstance.on('player_left', ({ playerId }: { playerId: string }) => {
      console.log('[v0] Player left:', playerId);
    });

    socketInstance.on('waiting_room_update', ({ players, game }: GameState) => {
      console.log('[v0] Waiting room update:', { players: players.length, game: game.status });
      setPlayers(players);
      setGame(game);
    });

    socketInstance.on('game_started', ({ game }: { game: Game }) => {
      console.log('[v0] Game started:', game);
      setGame(game);
    });

    socketInstance.on('board_locked', ({ player: updatedPlayer }: { player: Player }) => {
      console.log('[v0] Board locked for player:', updatedPlayer);
      setPlayer(updatedPlayer);
    });

    socketInstance.on('countdown_started', () => {
      console.log('[v0] Countdown started');
      setGame(prev => ({ ...prev, status: 'countdown' }));
    });

    socketInstance.on('countdown_tick', ({ count }: { count: number }) => {
      console.log('[v0] Countdown tick:', count);
      setGame(prev => ({ ...prev, countdown: count }));
    });

    socketInstance.on('game_playing', ({ game }: { game: Game }) => {
      console.log('[v0] Game playing');
      setGame(game);
    });

    socketInstance.on('new_called_number', ({ number, countdown, calledNumbers }: { number: number; countdown: number; calledNumbers: number[] }) => {
      console.log('[v0] New called number:', number);
      setGame(prev => ({ ...prev, currentNumber: number, numberCountdown: countdown, calledNumbers }));
    });

    socketInstance.on('number_countdown', ({ countdown, number }: { countdown: number; number: number }) => {
      setGame(prev => ({ ...prev, numberCountdown: countdown, currentNumber: number }));
    });

    socketInstance.on('number_display_ended', () => {
      setGame(prev => ({ ...prev, currentNumber: null, numberCountdown: null }));
    });

    socketInstance.on('number_missed', ({ number, player: updatedPlayer }: { number: number; player: Player }) => {
      console.log('[v0] Number missed:', number);
      setPlayer(updatedPlayer);
    });

    socketInstance.on('mark_success', ({ player: updatedPlayer }: { player: Player }) => {
      console.log('[v0] Mark success:', updatedPlayer);
      setPlayer(updatedPlayer);
    });

    socketInstance.on('player_bingo_update', ({ playerId, bingoLines }: { playerId: string; bingoLines: number; markedNumbers: number[] }) => {
      console.log('[v0] Player bingo update:', { playerId, bingoLines });
      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, bingoLines } : p));
    });

    socketInstance.on('bingo_available', () => {
      console.log('[v0] Bingo available!');
    });

    socketInstance.on('bingo_invalid', ({ message }: { message: string }) => {
      console.log('[v0] Bingo invalid:', message);
      setError(message);
    });

    socketInstance.on('winner_announced', ({ winner, bingoLines }: { winner: Player; bingoLines: number }) => {
      console.log('[v0] Winner announced:', winner, bingoLines);
      setGame(prev => ({ ...prev, status: 'ended', winnerId: winner.id }));
    });

    socketInstance.on('game_ended', ({ winner }: { winner: Player | null }) => {
      console.log('[v0] Game ended:', winner);
      setGame(prev => ({ ...prev, status: 'ended' }));
    });

    socketInstance.on('game_reset', ({ game }: { game: Game }) => {
      console.log('[v0] Game reset');
      setGame(game);
      setPlayer(prev => prev ? { ...prev, boardNumbers: [], markedNumbers: [], missedNumbers: [], bingoLines: 0, isReady: false, isBoardLocked: false } : null);
    });

    socketInstance.on('kicked', () => {
      console.log('[v0] Player kicked');
      localStorage.removeItem('bingo_nickname');
      setPlayer(null);
      setError('You have been kicked from the game');
    });

    socketInstance.on('game_state', ({ players, game }: GameState) => {
      console.log('[v0] Game state received');
      setPlayers(players);
      setGame(game);
    });

    // Request initial game state
    socketInstance.emit('get_game_state');

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinGame = useCallback((nickname: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join_game', { nickname });
    }
  }, []);

  const reconnectPlayer = useCallback((nickname: string) => {
    if (socketRef.current) {
      socketRef.current.emit('reconnect_player', { nickname });
    }
  }, []);

  const submitBoard = useCallback((board: number[]) => {
    if (socketRef.current && player) {
      socketRef.current.emit('submit_board', { playerId: player.id, board });
    }
  }, [player]);

  const updateBoardPosition = useCallback((board: number[]) => {
    if (socketRef.current && player) {
      socketRef.current.emit('update_board_position', { playerId: player.id, board });
    }
  }, [player]);

  const markNumber = useCallback((number: number) => {
    if (socketRef.current && player) {
      socketRef.current.emit('mark_number', { playerId: player.id, number });
    }
  }, [player]);

  const pressBingo = useCallback(() => {
    if (socketRef.current && player) {
      socketRef.current.emit('press_bingo', { playerId: player.id });
    }
  }, [player]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <SocketContext.Provider value={{
      socket,
      connected,
      player,
      players,
      game,
      setPlayer,
      joinGame,
      reconnectPlayer,
      submitBoard,
      updateBoardPosition,
      markNumber,
      pressBingo,
      error,
      clearError,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
