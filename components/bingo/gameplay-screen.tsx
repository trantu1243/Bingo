'use client';

import { useEffect, useRef } from 'react';
import { useSocket } from '@/lib/socket-context';
import { useSound } from '@/hooks/use-sound';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Clock, Wifi } from 'lucide-react';
import { toast } from 'sonner';

export function GameplayScreen() {
  const { player, players, game, markNumber, pressBingo } = useSocket();
  const { playNewNumber, playClick } = useSound();
  const lastNumberRef = useRef<number | null>(null);

  // Play sound when new number is called
  useEffect(() => {
    if (game.currentNumber && game.currentNumber !== lastNumberRef.current) {
      playNewNumber();
      lastNumberRef.current = game.currentNumber;
    }
  }, [game.currentNumber, playNewNumber]);

  const handleCellClick = (number: number) => {
    // Check if number is disabled (missed)
    if (player?.missedNumbers?.includes(number)) {
      toast.error('Ô này đã bị vô hiệu - bạn đã bỏ lỡ!');
      return;
    }
    
    // Can only mark the current number being called
    if (game.currentNumber !== number) {
      if (game.calledNumbers.includes(number)) {
        toast.error('Hết thời gian cho số này!');
      } else {
        toast.error('Số này chưa được gọi!');
      }
      return;
    }
    
    if (player?.markedNumbers.includes(number)) {
      return;
    }

    playClick();
    markNumber(number);
  };

  const handleBingoClick = () => {
    if (player && player.bingoLines >= 3) {
      pressBingo();
    } else {
      toast.error('Bạn cần ít nhất 3 đường Bingo!');
    }
  };

  const canBingo = player && player.bingoLines >= 3;

  // Sort players by bingo lines
  const sortedPlayers = [...players]
    .filter(p => p.isOnline)
    .sort((a, b) => b.bingoLines - a.bingoLines);

  return (
    <div className="min-h-screen flex flex-col p-2 md:p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-60 md:w-80 h-60 md:h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-60 md:w-80 h-60 md:h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-3 lg:gap-6">
        {/* Left side - Current number + Board */}
        <div className="flex-1 flex flex-col gap-3 md:gap-4">
          {/* Current number display */}
          <div className="glass-card rounded-2xl p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="text-xs md:text-sm font-medium text-muted-foreground">So hien tai</h2>
              {game.numberCountdown !== null && (
                <div className="flex items-center gap-2">
                  <Clock className="w-3 md:w-4 h-3 md:h-4 text-primary" />
                  <span className="font-mono text-base md:text-lg font-bold text-primary">
                    {game.numberCountdown}s
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-center">
              {game.currentNumber ? (
                <div className="relative">
                  <div 
                    className="w-24 h-24 md:w-40 md:h-40 rounded-full bg-primary/20 border-4 border-primary flex items-center justify-center animate-pulse-glow"
                  >
                    <span className="text-5xl md:text-7xl font-black text-primary">
                      {game.currentNumber}
                    </span>
                  </div>
                  {game.numberCountdown !== null && (
                    <Progress 
                      value={(game.numberCountdown / 5) * 100} 
                      className="absolute -bottom-3 md:-bottom-4 left-0 right-0 h-1.5 md:h-2"
                    />
                  )}
                </div>
              ) : (
                <div className="w-24 h-24 md:w-40 md:h-40 rounded-full bg-muted/20 border-2 border-muted flex items-center justify-center">
                  <span className="text-muted-foreground text-xs md:text-sm">Đang chờ...</span>
                </div>
              )}
            </div>
          </div>

          {/* Bingo Board */}
          <div className="glass-card rounded-2xl p-3 md:p-6 flex-1">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="text-xs md:text-sm font-medium text-muted-foreground">Bảng của bạn</h2>
              <div className="flex items-center gap-2">
                <Star className="w-3 md:w-4 h-3 md:h-4 text-primary" />
                <span className="font-medium text-sm md:text-base">{player?.bingoLines || 0} Đường</span>
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-1.5 md:gap-2 max-w-[280px] md:max-w-[400px] mx-auto">
              {player?.boardNumbers.map((number, index) => {
                const isMarked = player.markedNumbers.includes(number);
                const isMissed = player.missedNumbers?.includes(number);
                
                return (
                  <button
                    key={index}
                    onClick={() => handleCellClick(number)}
                    disabled={isMissed}
                    className={`
                      aspect-square bingo-cell text-base md:text-xl
                      ${isMarked ? 'marked' : ''}
                      ${isMissed ? 'missed' : ''}
                    `}
                  >
                    {number}
                    {isMarked && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 md:w-10 md:h-10 rounded-full bg-primary/30 animate-ping" />
                      </div>
                    )}
                    {isMissed && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-destructive rotate-45" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bingo button */}
            <div className="mt-4 md:mt-6">
              <Button
                onClick={handleBingoClick}
                disabled={!canBingo}
                className={`
                  w-full h-12 md:h-16 text-xl md:text-2xl font-black tracking-wider
                  ${canBingo 
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground animate-pulse-glow' 
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }
                `}
              >
                BINGO!
              </Button>
              {!canBingo && (
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Bạn cần 3 đường để gọi Bingo (cần thêm {3 - (player?.bingoLines || 0)} đường)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Called numbers + Players */}
        <div className="w-full lg:w-72 xl:w-96 flex flex-col gap-3 md:gap-4">
          {/* Called numbers */}
          <div className="glass-card rounded-2xl p-3 md:p-4">
            <h2 className="text-xs md:text-sm font-medium text-muted-foreground mb-2 md:mb-3">
              Số đã gọi ({game.calledNumbers.length}/25)
            </h2>
            <div className="grid grid-cols-5 gap-1.5 md:gap-2">
              {Array.from({ length: 25 }, (_, i) => i + 1).map((number) => {
                const isCalled = game.calledNumbers.includes(number);
                const isCurrent = game.currentNumber === number;
                
                return (
                  <div
                    key={number}
                    className={`
                      aspect-square flex items-center justify-center rounded-lg text-xs md:text-sm font-medium
                      ${isCurrent 
                        ? 'bg-primary text-primary-foreground animate-pulse' 
                        : isCalled 
                          ? 'bg-primary/20 text-primary border border-primary/50' 
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

          {/* Players leaderboard */}
          <div className="glass-card rounded-2xl p-3 md:p-4 flex-1">
            <h2 className="text-xs md:text-sm font-medium text-muted-foreground mb-2 md:mb-3">
              Bảng xếp hạng
            </h2>
            <ScrollArea className="h-[150px] md:h-[200px] lg:h-[calc(100vh-520px)]">
              <div className="space-y-1.5 md:space-y-2 pr-2">
                {sortedPlayers.map((p, index) => (
                  <div
                    key={p.id}
                    className={`
                      glass p-2 md:p-3 rounded-xl flex items-center gap-2 md:gap-3
                      ${p.id === player?.id ? 'border border-primary/50' : ''}
                    `}
                  >
                    {/* Rank */}
                    <div className={`
                      w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold
                      ${index === 0 ? 'bg-yellow-500 text-black' : ''}
                      ${index === 1 ? 'bg-gray-300 text-black' : ''}
                      ${index === 2 ? 'bg-amber-600 text-white' : ''}
                      ${index > 2 ? 'bg-muted text-muted-foreground' : ''}
                    `}>
                      {index + 1}
                    </div>

                    {/* Avatar */}
                    <div
                      className="w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold text-background shrink-0"
                      style={{ backgroundColor: p.avatarColor }}
                    >
                      {p.nickname.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs md:text-sm truncate">
                        {p.nickname}
                        {p.id === player?.id && (
                          <span className="text-primary ml-1 text-[10px] md:text-xs">(Bạn)</span>
                        )}
                      </p>
                    </div>

                    {/* Lines count */}
                    <div className="flex items-center gap-1">
                      {p.bingoLines >= 3 && (
                        <Trophy className="w-3 h-3 md:w-4 md:h-4 text-primary animate-pulse" />
                      )}
                      <span className={`
                        font-bold text-xs md:text-sm
                        ${p.bingoLines >= 3 ? 'text-primary' : 'text-muted-foreground'}
                      `}>
                        {p.bingoLines}
                      </span>
                    </div>

                    {/* Online status */}
                    <Wifi className="w-2.5 h-2.5 md:w-3 md:h-3 text-success" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
