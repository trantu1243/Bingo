'use client';

import { useEffect, useCallback } from 'react';
import { useSocket } from '@/lib/socket-context';
import { useSound } from '@/hooks/use-sound';
import { Button } from '@/components/ui/button';
import { Trophy, Star, RotateCcw, Home } from 'lucide-react';
import confetti from 'canvas-confetti';

export function WinnerScreen() {
  const { player, players, game, setPlayer } = useSocket();
  const { playWin } = useSound();

  const winner = players.find(p => p.id === game.winnerId);
  const isWinner = player?.id === game.winnerId;

  const fireConfetti = useCallback(() => {
    const duration = 5000;
    const end = Date.now() + duration;

    const colors = ['#fbbf24', '#f59e0b', '#ffffff', '#eab308'];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  useEffect(() => {
    if (winner) {
      playWin();
      fireConfetti();
    }
  }, [winner, playWin, fireConfetti]);

  const handlePlayAgain = () => {
    window.location.reload();
  };

  const handleBackToLobby = () => {
    localStorage.removeItem('bingo_nickname');
    setPlayer(null);
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-primary/20 rounded-full blur-[100px] animate-pulse" />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-lg w-full px-4">
        {/* Trophy icon */}
        <div className="mb-6 md:mb-8 animate-bounce-in">
          <div className="w-24 h-24 md:w-32 md:h-32 mx-auto rounded-full bg-primary/20 border-4 border-primary flex items-center justify-center animate-pulse-glow">
            <Trophy className="w-12 h-12 md:w-16 md:h-16 text-primary" />
          </div>
        </div>

        {/* Winner announcement */}
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h1 className="text-3xl md:text-6xl font-black text-primary mb-4">
            {isWinner ? 'BẠN THẮNG!' : 'NGƯỜI THẮNG!'}
          </h1>
          
          {winner && (
            <div className="glass-card rounded-2xl p-4 md:p-6 mb-6 md:mb-8">
              <div className="flex items-center justify-center gap-3 md:gap-4 mb-4">
                <div
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl md:text-3xl font-bold text-background"
                  style={{ backgroundColor: winner.avatarColor }}
                >
                  {winner.nickname.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-xl md:text-2xl font-bold">{winner.nickname}</p>
                  <div className="flex items-center gap-2 text-primary">
                    <Star className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                    <span className="font-medium text-sm md:text-base">{winner.bingoLines} Đường Bingo</span>
                  </div>
                </div>
              </div>

              {/* Winner's board preview */}
              <div className="mt-4">
                <p className="text-xs md:text-sm text-muted-foreground mb-2">Bảng chiến thắng</p>
                <div className="grid grid-cols-5 gap-1 max-w-[180px] md:max-w-[200px] mx-auto">
                  {winner.boardNumbers.map((number, index) => {
                    const isMarked = winner.markedNumbers.includes(number);
                    return (
                      <div
                        key={index}
                        className={`
                          aspect-square flex items-center justify-center rounded text-[10px] md:text-xs font-medium
                          ${isMarked 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted/30 text-muted-foreground'
                          }
                        `}
                      >
                        {number}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
            <Button
              onClick={handlePlayAgain}
              className="h-12 md:h-14 px-6 md:px-8 text-base md:text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
              Chơi lại
            </Button>
            
            <Button
              onClick={handleBackToLobby}
              variant="outline"
              className="h-12 md:h-14 px-6 md:px-8 text-base md:text-lg font-medium gap-2"
            >
              <Home className="w-4 h-4 md:w-5 md:h-5" />
              Về phòng chờ
            </Button>
          </div>
        </div>

        {/* Message for non-winners */}
        {!isWinner && (
          <div className="mt-6 md:mt-8 glass p-3 md:p-4 rounded-xl animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <p className="text-muted-foreground text-sm md:text-base">
              Chuc may man lan sau! Ban da co {player?.bingoLines || 0} duong.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
