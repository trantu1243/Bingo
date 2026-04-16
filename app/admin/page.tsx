'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Shuffle, 
  UserX, 
  Users, 
  Wifi, 
  WifiOff,
  Trophy,
  Zap,
  Timer,
  Hash,
  Lock,
  Eye,
  EyeOff,
  LogOut
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Player, Game } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

// Hardcoded admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin@123';

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [game, setGame] = useState<Game>({
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
  });

  // Check if already logged in (using sessionStorage)
  useEffect(() => {
    const loggedIn = sessionStorage.getItem('admin_logged_in');
    if (loggedIn === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      sessionStorage.setItem('admin_logged_in', 'true');
      toast.success('Đăng nhập thành công!');
    } else {
      setLoginError('Tên đăng nhập hoặc mật khẩu không đúng');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('admin_logged_in');
    socket?.disconnect();
    setSocket(null);
    toast.success('Đã đăng xuất');
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    const socketInstance = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setConnected(true);
      socketInstance.emit('get_game_state');
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
    });

    socketInstance.on('game_state', ({ players, game }: { players: Player[]; game: Game }) => {
      setPlayers(players);
      setGame(game);
    });

    socketInstance.on('waiting_room_update', ({ players, game }: { players: Player[]; game: Game }) => {
      setPlayers(players);
      setGame(game);
    });

    socketInstance.on('game_started', ({ game }: { game: Game }) => {
      setGame(game);
      toast.success('Trò chơi đã bắt đầu!');
    });

    socketInstance.on('countdown_started', () => {
      setGame(prev => ({ ...prev, status: 'countdown' }));
    });

    socketInstance.on('countdown_tick', ({ count }: { count: number }) => {
      setGame(prev => ({ ...prev, countdown: count }));
    });

    socketInstance.on('game_playing', ({ game }: { game: Game }) => {
      setGame(game);
      toast.success('Trò chơi đang diễn ra!');
    });

    socketInstance.on('new_called_number', ({ number, countdown, calledNumbers }: { number: number; countdown: number; calledNumbers: number[] }) => {
      setGame(prev => ({ ...prev, currentNumber: number, numberCountdown: countdown, calledNumbers }));
    });

    socketInstance.on('number_countdown', ({ countdown, number }: { countdown: number; number: number }) => {
      setGame(prev => ({ ...prev, numberCountdown: countdown, currentNumber: number }));
    });

    socketInstance.on('number_display_ended', () => {
      setGame(prev => ({ ...prev, currentNumber: null, numberCountdown: null }));
    });

    socketInstance.on('player_bingo_update', ({ playerId, bingoLines }: { playerId: string; bingoLines: number }) => {
      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, bingoLines } : p));
    });

    socketInstance.on('winner_announced', ({ winner }: { winner: Player }) => {
      setGame(prev => ({ ...prev, status: 'ended', winnerId: winner.id }));
      setShowWinnerModal(true);
    });

    socketInstance.on('game_ended', () => {
      setGame(prev => ({ ...prev, status: 'ended' }));
    });

    socketInstance.on('game_reset', ({ game }: { game: Game }) => {
      setGame(game);
      setShowWinnerModal(false);
      toast.success('Đã đặt lại trò chơi!');
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [isLoggedIn]);

  const handleStartGame = useCallback(() => {
    socket?.emit('admin_start_game');
  }, [socket]);

  const handleForceStart = useCallback(() => {
    socket?.emit('admin_force_start');
  }, [socket]);

  const handleStartCountdown = useCallback(() => {
    socket?.emit('admin_start_countdown');
  }, [socket]);

  const handleSelectNumber = useCallback((number: number) => {
    socket?.emit('admin_select_number', { number });
  }, [socket]);

  const handleRandomNumber = useCallback(() => {
    socket?.emit('admin_random_number');
  }, [socket]);

  const handleEndGame = useCallback(() => {
    socket?.emit('admin_end_game');
  }, [socket]);

  const handleResetGame = useCallback(() => {
    socket?.emit('admin_reset_game');
  }, [socket]);

  const handleKickPlayer = useCallback((playerId: string) => {
    socket?.emit('admin_kick_player', { playerId });
    toast.success('Đã đá người chơi');
  }, [socket]);

  const onlinePlayers = players.filter(p => p.isOnline);
  const offlinePlayers = players.filter(p => !p.isOnline);
  const readyPlayers = players.filter(p => p.isBoardLocked);
  const winner = players.find(p => p.id === game.winnerId);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'waiting': return { label: 'Đang chờ', color: 'bg-muted text-muted-foreground', description: 'Người chơi có thể tham gia phòng' };
      case 'setup': return { label: 'Thiết lập bảng', color: 'bg-blue-500/20 text-blue-500', description: 'Người chơi đang thiết lập bảng của họ' };
      case 'countdown': return { label: 'Đang bắt đầu...', color: 'bg-orange-500/20 text-orange-500', description: 'Đếm ngược đang chạy' };
      case 'playing': return { label: 'Đang chơi', color: 'bg-green-500/20 text-green-500', description: 'Trò chơi đang diễn ra' };
      case 'ended': return { label: 'Kết thúc', color: 'bg-primary/20 text-primary', description: 'Trò chơi đã kết thúc' };
      default: return { label: status, color: 'bg-muted text-muted-foreground', description: '' };
    }
  };

  const statusInfo = getStatusInfo(game.status);

  // Login screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <Toaster position="top-center" richColors theme="dark" />
        
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-60 md:w-80 h-60 md:h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-60 md:w-80 h-60 md:h-80 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <Card className="glass-card border-border/50 w-full max-w-md relative z-10">
          <CardHeader className="text-center">
            <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
              <Lock className="w-7 h-7 md:w-8 md:h-8 text-primary" />
            </div>
            <CardTitle className="text-xl md:text-2xl">Đăng nhập Admin</CardTitle>
            <CardDescription>Nhập thông tin đăng nhập để truy cập</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tên đăng nhập</label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  className="h-11 md:h-12"
                  autoComplete="username"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Mật khẩu</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="h-11 md:h-12 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <p className="text-sm text-destructive text-center">{loginError}</p>
              )}

              <Button type="submit" className="w-full h-11 md:h-12 bg-primary hover:bg-primary/90">
                Đăng nhập
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 md:p-8 relative overflow-hidden">
      <Toaster position="top-center" richColors theme="dark" />
      
      {/* Winner Modal */}
      <AnimatePresence>
        {showWinnerModal && winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={() => setShowWinnerModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="glass-card border-primary/50 p-6 md:p-12 rounded-3xl text-center max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Trophy className="w-16 h-16 md:w-20 md:h-20 text-primary mx-auto mb-4" />
              </motion.div>
              <h2 className="text-2xl md:text-3xl font-black text-primary mb-2">NGƯỜI THẮNG!</h2>
              <div
                className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-full flex items-center justify-center text-2xl md:text-3xl font-bold text-background mb-4"
                style={{ backgroundColor: winner.avatarColor }}
              >
                {winner.nickname.charAt(0).toUpperCase()}
              </div>
              <p className="text-xl md:text-2xl font-bold mb-2">{winner.nickname}</p>
              <p className="text-muted-foreground mb-6">{winner.bingoLines} đường đã hoàn thành</p>
              <Button onClick={() => setShowWinnerModal(false)} className="bg-primary hover:bg-primary/90">
                Đóng
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-60 md:w-80 h-60 md:h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-60 md:w-80 h-60 md:h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-primary">
            Quản lý trò chơi
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm">Điều khiển trò chơi Bingo</p>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4">
          <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2 h-8 md:h-9">
            <LogOut className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden md:inline">Đăng xuất</span>
          </Button>
          
          {connected ? (
            <div className="flex items-center gap-2 text-success text-xs md:text-sm glass px-2 md:px-3 py-1 rounded-full">
              <Wifi className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden md:inline">Đã kết nối</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-destructive text-xs md:text-sm glass px-2 md:px-3 py-1 rounded-full">
              <WifiOff className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden md:inline">Mất kết nối</span>
            </div>
          )}
        </div>
      </header>

      {/* Game Status Banner */}
      <div className="relative z-10 mb-4 md:mb-6">
        <Card className={`glass-card border-border/50 ${statusInfo.color}`}>
          <CardContent className="p-3 md:p-4 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <Badge className={`${statusInfo.color} text-sm md:text-lg px-3 md:px-4 py-0.5 md:py-1`}>
                {statusInfo.label}
              </Badge>
              <span className="text-xs md:text-sm text-muted-foreground">{statusInfo.description}</span>
            </div>
            {game.countdown !== null && game.status === 'countdown' && (
              <div className="text-xl md:text-2xl font-bold text-primary animate-pulse">
                Bat dau trong {game.countdown}...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left column - Stats & Controls */}
        <div className="space-y-4 md:space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <Card className="glass-card border-border/50">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <Users className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold">{onlinePlayers.length}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Trực tuyến</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card border-border/50">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 md:gap-3">
                  <Hash className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold">{game.calledNumbers.length}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Đã gọi</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Game controls */}
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-base md:text-lg">Điều khiển</CardTitle>
              <CardDescription className="text-xs md:text-sm">Quản lý tiến trình trò chơi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 md:space-y-3">
              {game.status === 'waiting' && (
                <>
                  <Button
                    onClick={handleStartGame}
                    disabled={onlinePlayers.length < 1}
                    className="w-full h-10 md:h-12 gap-2 bg-primary hover:bg-primary/90 text-sm md:text-base"
                  >
                    <Play className="w-4 h-4" />
                    Bắt đầu (Cần 20)
                  </Button>
                  <Button
                    onClick={handleForceStart}
                    disabled={onlinePlayers.length < 1}
                    variant="outline"
                    className="w-full h-10 md:h-12 gap-2 text-sm md:text-base"
                  >
                    <Zap className="w-4 h-4" />
                    Bắt đầu ngay ({onlinePlayers.length} người)
                  </Button>
                </>
              )}

              {game.status === 'setup' && (
                <Button
                  onClick={handleStartCountdown}
                  className="w-full h-10 md:h-12 gap-2 bg-primary hover:bg-primary/90 text-sm md:text-base"
                >
                  <Timer className="w-4 h-4" />
                  Bắt đầu đếm ngược
                </Button>
              )}

              {game.status === 'playing' && (
                <Button
                  onClick={handleEndGame}
                  variant="destructive"
                  className="w-full h-10 md:h-12 gap-2 text-sm md:text-base"
                >
                  <Square className="w-4 h-4" />
                  Kết thúc
                </Button>
              )}

              {(game.status === 'ended' || game.status === 'waiting') && (
                <Button
                  onClick={handleResetGame}
                  variant="outline"
                  className="w-full h-10 md:h-12 gap-2 text-sm md:text-base"
                >
                  <RotateCcw className="w-4 h-4" />
                  Đặt lại trò chơi
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Winner display in sidebar */}
          {winner && (
            <Card 
              className="glass-card border-primary/50 cursor-pointer hover:border-primary transition-colors"
              onClick={() => setShowWinnerModal(true)}
            >
              <CardContent className="p-4 md:p-6 text-center">
                <Trophy className="w-10 h-10 md:w-12 md:h-12 text-primary mx-auto mb-2 md:mb-3" />
                <h3 className="text-base md:text-lg font-bold text-primary mb-1">Người thắng!</h3>
                <p className="text-lg md:text-xl font-bold">{winner.nickname}</p>
                <p className="text-xs md:text-sm text-muted-foreground">{winner.bingoLines} đường</p>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-2">Nhấn để hiện thông báo</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Middle column - Number selector */}
        <div className="space-y-4 md:space-y-6">
          {/* Current number display */}
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-base md:text-lg">Số hiện tại</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                {game.currentNumber ? (
                  <div className="relative">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/20 border-4 border-primary flex items-center justify-center">
                      <span className="text-3xl md:text-4xl font-black text-primary">{game.currentNumber}</span>
                    </div>
                    {game.numberCountdown !== null && (
                      <div className="mt-2">
                        <Progress value={(game.numberCountdown / 5) * 100} className="h-1.5 md:h-2" />
                        <p className="text-center text-xs md:text-sm text-muted-foreground mt-1">
                          {game.numberCountdown}s
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-muted/20 border-2 border-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">-</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Number picker */}
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-base md:text-lg flex items-center justify-between">
                Chọn số
                <Button
                  onClick={handleRandomNumber}
                  disabled={game.status !== 'playing' || game.currentNumber !== null}
                  size="sm"
                  variant="outline"
                  className="gap-1 h-7 md:h-8 text-xs md:text-sm"
                >
                  <Shuffle className="w-3 h-3" />
                  Ngẫu nhiên
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-1.5 md:gap-2">
                {Array.from({ length: 25 }, (_, i) => i + 1).map((number) => {
                  const isCalled = game.calledNumbers.includes(number);
                  const isCurrent = game.currentNumber === number;
                  const isInQueue = game.numberQueue.includes(number);
                  
                  return (
                    <button
                      key={number}
                      onClick={() => handleSelectNumber(number)}
                      disabled={game.status !== 'playing' || isCalled || isCurrent || isInQueue || game.currentNumber !== null}
                      className={`
                        aspect-square flex items-center justify-center rounded-lg text-xs md:text-sm font-bold transition-all
                        ${isCurrent 
                          ? 'bg-primary text-primary-foreground animate-pulse' 
                          : isCalled 
                            ? 'bg-primary/30 text-primary/50 cursor-not-allowed' 
                            : isInQueue
                              ? 'bg-orange-500/30 text-orange-500'
                              : game.status === 'playing' && game.currentNumber === null
                                ? 'bg-muted/30 hover:bg-primary/20 hover:text-primary cursor-pointer'
                                : 'bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50'
                        }
                      `}
                    >
                      {number}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground text-center mt-2 md:mt-3">
                {game.status === 'playing' 
                  ? game.currentNumber !== null 
                    ? 'Chờ số hiện tại kết thúc'
                    : 'Nhấn vào số để gọi'
                  : 'Bắt đầu trò chơi để gọi số'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Players list */}
        <div className="space-y-4 md:space-y-6">
          <Card className="glass-card border-border/50">
            <CardHeader className="pb-2 md:pb-3">
              <CardTitle className="text-base md:text-lg">
                Người chơi ({onlinePlayers.length}/{game.maxPlayers})
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Sẵn sàng: {readyPlayers.length} / Ngoại tuyến: {offlinePlayers.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] md:h-[500px]">
                <div className="space-y-1.5 md:space-y-2 pr-2 md:pr-4">
                  {/* Online players */}
                  {onlinePlayers.map((p) => (
                    <div
                      key={p.id}
                      className={`
                        glass p-2 md:p-3 rounded-xl flex items-center gap-2 md:gap-3
                        ${p.id === game.winnerId ? 'border border-primary/50' : ''}
                      `}
                    >
                      <div
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold text-background shrink-0"
                        style={{ backgroundColor: p.avatarColor }}
                      >
                        {p.nickname.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs md:text-sm truncate">{p.nickname}</p>
                        <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs text-muted-foreground">
                          {p.isBoardLocked && <Badge variant="outline" className="text-[10px] md:text-xs py-0">Sẵn sàng</Badge>}
                          {p.bingoLines > 0 && (
                            <span className="text-primary">{p.bingoLines} đường</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 md:gap-2">
                        {p.id === game.winnerId && <Trophy className="w-3 h-3 md:w-4 md:h-4 text-primary" />}
                        <Wifi className="w-2.5 h-2.5 md:w-3 md:h-3 text-success" />
                        <Button
                          onClick={() => handleKickPlayer(p.id)}
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 md:h-7 md:w-7 text-muted-foreground hover:text-destructive"
                        >
                          <UserX className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Offline players */}
                  {offlinePlayers.length > 0 && (
                    <>
                      <div className="text-[10px] md:text-xs text-muted-foreground mt-3 md:mt-4 mb-1 md:mb-2">Ngoại tuyến</div>
                      {offlinePlayers.map((p) => (
                        <div
                          key={p.id}
                          className="glass p-2 md:p-3 rounded-xl flex items-center gap-2 md:gap-3 opacity-50"
                        >
                          <div
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold text-background shrink-0 grayscale"
                            style={{ backgroundColor: p.avatarColor }}
                          >
                            {p.nickname.charAt(0).toUpperCase()}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs md:text-sm truncate">{p.nickname}</p>
                          </div>

                          <div className="flex items-center gap-1 md:gap-2">
                            <WifiOff className="w-2.5 h-2.5 md:w-3 md:h-3 text-muted-foreground" />
                            <Button
                              onClick={() => handleKickPlayer(p.id)}
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 md:h-7 md:w-7 text-muted-foreground hover:text-destructive"
                            >
                              <UserX className="w-2.5 h-2.5 md:w-3 md:h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
