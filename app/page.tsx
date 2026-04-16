'use client';

import { useSocket } from '@/lib/socket-context';
import { LandingPage } from '@/components/bingo/landing-page';
import { WaitingRoom } from '@/components/bingo/waiting-room';
import { BoardSetup } from '@/components/bingo/board-setup';
import { CountdownScreen } from '@/components/bingo/countdown-screen';
import { GameplayScreen } from '@/components/bingo/gameplay-screen';
import { WinnerScreen } from '@/components/bingo/winner-screen';
import { Loader2 } from 'lucide-react';

export default function BingoGame() {
  const { player, game, connected } = useSocket();

  // Hiển thị trạng thái nạp khi kết nối
  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Đang kết nối đến máy chủ...</p>
        </div>
      </div>
    );
  }

  // Hiển thị trang chờ nếu chưa tham gia
  if (!player) {
    return <LandingPage />;
  }

  // Hiển thị màn hình khác nhau theo trạng thái trò chơi
  switch (game.status) {
    case 'waiting':
      return <WaitingRoom />;
    
    case 'setup':
      return <BoardSetup />;
    
    case 'countdown':
      return <CountdownScreen />;
    
    case 'playing':
      return <GameplayScreen />;
    
    case 'ended':
      return <WinnerScreen />;
    
    default:
      return <WaitingRoom />;
  }
}
