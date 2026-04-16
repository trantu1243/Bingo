export interface Player {
  id: string;
  nickname: string;
  socketId: string | null;
  boardNumbers: number[];
  markedNumbers: number[];
  missedNumbers: number[]; // Numbers the player failed to mark in time - disabled cells
  bingoLines: number;
  isReady: boolean;
  isBoardLocked: boolean;
  isOnline: boolean;
  joinedAt: number;
  avatarColor: string;
}

export interface Game {
  id: string | null;
  status: 'waiting' | 'setup' | 'countdown' | 'playing' | 'ended';
  calledNumbers: number[];
  currentNumber: number | null;
  countdown: number | null;
  winnerId: string | null;
  maxPlayers: number;
  startedAt: number | null;
  endedAt: number | null;
  setupEndTime: number | null;
  adminSelectedNumbers: number[];
  numberQueue: number[];
  numberCountdown: number | null;
}

export interface GameState {
  players: Player[];
  game: Game;
}
