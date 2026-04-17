'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/lib/socket-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Users, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

export function LandingPage() {
  const { connected, joinGame, error, clearError, players, game } = useSocket();
  const [nickname, setNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = () => {
    if (!nickname.trim()) {
      toast.error('Vui lòng nhập tên của bạn');
      return;
    }

    if (nickname.length > 20) {
      toast.error('Tên không được quá 20 ký tự');
    }

    setIsJoining(true);
    joinGame(nickname.trim());
    
    setTimeout(() => setIsJoining(false), 2000);
  };

  // Handle error display and clearing
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
      setIsJoining(false);
    }
  }, [error, clearError]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-60 md:w-80 h-60 md:h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-60 md:w-80 h-60 md:h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md px-2">
        {/* Logo/Title */}
        <div className="text-center mb-8 md:mb-12 animate-slide-up">
          <h1 className="text-4xl md:text-6xl font-bold text-primary mb-2 tracking-tight">
            {"Fotober's"}
          </h1>
          <h2 className="text-5xl md:text-7xl font-black text-foreground">
            BINGO
          </h2>
          <p className="text-muted-foreground mt-3 md:mt-4 text-base md:text-lg">
            Chơi cùng tối đa 20 người chơi
          </p>
        </div>

        {/* Connection status */}
        <div className="flex items-center justify-center gap-2 mb-6 md:mb-8">
          {connected ? (
            <div className="flex items-center gap-2 text-success text-sm glass px-4 py-2 rounded-full">
              <Wifi className="w-4 h-4" />
              <span>Đã kết nối</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-destructive text-sm glass px-4 py-2 rounded-full">
              <WifiOff className="w-4 h-4" />
              <span>Đang kết nối...</span>
            </div>
          )}
        </div>

        {/* Join form */}
        <div className="glass-card rounded-2xl p-6 md:p-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="space-y-5 md:space-y-6">
            <div className="space-y-2">
              <label htmlFor="nickname" className="text-sm font-medium text-muted-foreground">
                Tên của bạn
              </label>
              <Input
                id="nickname"
                type="text"
                placeholder="Nhập tên của bạn"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                maxLength={20}
                className="h-12 md:h-14 text-base md:text-lg bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                disabled={!connected || isJoining}
              />
              <p className="text-xs text-muted-foreground text-right">
                {nickname.length}/20 kí tự
              </p>
            </div>

            <Button
              onClick={handleJoin}
              disabled={!connected || isJoining || !nickname.trim()}
              className="w-full h-12 md:h-14 text-base md:text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 disabled:opacity-50"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Đang tham gia...
                </>
              ) : (
                'Tham gia'
              )}
            </Button>
          </div>
        </div>

        {/* Players count */}
        <div className="mt-6 md:mt-8 text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="glass inline-flex items-center gap-3 px-5 md:px-6 py-2 md:py-3 rounded-full">
            <Users className="w-4 md:w-5 h-4 md:h-5 text-primary" />
            <span className="text-foreground font-medium text-sm md:text-base">
              {players.filter(p => p.isOnline).length}/{game.maxPlayers} nguoi choi truc tuyen
            </span>
          </div>
        </div>

        {/* Game status */}
        {game.status !== 'waiting' && (
          <div className="mt-4 text-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm">
              <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
              <span className="text-warning">
                Trò chơi đang diễn ra - {game.status === 'playing' ? 'Đang chơi' : game.status === 'setup' ? 'Chuẩn bị' : game.status}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
