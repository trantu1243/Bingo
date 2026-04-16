'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/lib/socket-context';
import { useSound } from '@/hooks/use-sound';

export function CountdownScreen() {
  const { game } = useSocket();
  const { playCountdown, playGo } = useSound();
  const [displayCount, setDisplayCount] = useState<number | string>(3);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (game.countdown !== null && game.countdown !== undefined) {
      if (game.countdown > 0) {
        setDisplayCount(game.countdown);
        setAnimationKey(prev => prev + 1);
        playCountdown();
      } else {
        setDisplayCount('BẮT ĐẦU!');
        setAnimationKey(prev => prev + 1);
        playGo();
      }
    }
  }, [game.countdown, playCountdown, playGo]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-primary/20 rounded-full blur-[100px] animate-pulse" />
      </div>

      {/* Countdown number */}
      <div
        key={animationKey}
        className="relative z-10 animate-bounce-in"
      >
        <div
          className={`
            font-black tracking-tight text-center
            ${typeof displayCount === 'string' 
              ? 'text-5xl md:text-8xl lg:text-[150px] text-primary' 
              : 'text-7xl md:text-9xl lg:text-[250px] text-foreground'
            }
          `}
          style={{
            textShadow: typeof displayCount === 'string'
              ? '0 0 100px rgba(234, 179, 8, 0.5)'
              : '0 0 50px rgba(255, 255, 255, 0.2)',
          }}
        >
          {displayCount}
        </div>
      </div>

      {/* Decorative rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div 
          className="w-[300px] h-[300px] md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px] border border-primary/20 rounded-full animate-ping"
          style={{ animationDuration: '2s' }}
        />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div 
          className="w-[400px] h-[400px] md:w-[650px] md:h-[650px] lg:w-[800px] lg:h-[800px] border border-primary/10 rounded-full animate-ping"
          style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}
        />
      </div>

      {/* Title */}
      <div className="absolute bottom-16 md:bottom-20 left-0 right-0 text-center">
        <p className="text-muted-foreground text-base md:text-lg">
          Chuẩn bị sẵn sàng!
        </p>
      </div>
    </div>
  );
}
