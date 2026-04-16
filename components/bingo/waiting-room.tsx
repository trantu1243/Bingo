'use client';

import { useSocket } from '@/lib/socket-context';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Clock, Wifi, WifiOff, LogOut } from 'lucide-react';

export function WaitingRoom() {
  const { player, players, game, setPlayer } = useSocket();

  const onlinePlayers = players.filter(p => p.isOnline);
  const offlinePlayers = players.filter(p => !p.isOnline);

  const handleLeave = () => {
    localStorage.removeItem('bingo_nickname');
    setPlayer(null);
  };

  return (
    <div className="min-h-screen flex flex-col p-3 md:p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-60 md:w-80 h-60 md:h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-60 md:w-80 h-60 md:h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between mb-4 md:mb-8">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-primary">
            {"Fotobe's"} <span className="text-foreground">BINGO</span>
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm">Phòng chờ</p>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <div className="glass px-3 md:px-4 py-1.5 md:py-2 rounded-full flex items-center gap-2">
            <Users className="w-3 md:w-4 h-3 md:h-4 text-primary" />
            <span className="font-medium text-sm md:text-base">{onlinePlayers.length}/{game.maxPlayers}</span>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLeave}
            className="text-muted-foreground hover:text-destructive h-8 w-8 md:h-10 md:w-10"
          >
            <LogOut className="w-4 md:w-5 h-4 md:h-5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-4 md:gap-6">
        {/* Player info card */}
        <div className="lg:w-80 shrink-0">
          <div className="glass-card rounded-2xl p-4 md:p-6 h-full">
            <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Thông tin của bạn</h2>
            
            {player && (
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div
                  className="w-12 md:w-16 h-12 md:h-16 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold text-background"
                  style={{ backgroundColor: player.avatarColor }}
                >
                  {player.nickname.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-base md:text-lg">{player.nickname}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {player.isReady ? 'Sẵn sàng' : 'Đang chờ'}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3 md:space-y-4">
              <div className="glass p-3 md:p-4 rounded-xl">
                <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mb-1">
                  <Clock className="w-3 md:w-4 h-3 md:h-4" />
                  <span>Trạng thái</span>
                </div>
                <p className="font-medium capitalize text-sm md:text-base">
                  {game.status === 'waiting' ? 'Đang chờ' : 
                   game.status === 'setup' ? 'Chuẩn bị' :
                   game.status === 'playing' ? 'Đang chơi' : game.status}
                </p>
              </div>

              <div className="glass p-3 md:p-4 rounded-xl">
                <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mb-1">
                  <Users className="w-3 md:w-4 h-3 md:h-4" />
                  <span>Cần thêm</span>
                </div>
                <p className="font-medium text-sm md:text-base">
                  {Math.max(0, 20 - onlinePlayers.length)} người nữa để bắt đầu
                </p>
              </div>
            </div>

            {/* Status message */}
            <div className="mt-4 md:mt-6 p-3 md:p-4 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-xs md:text-sm text-primary">
                {onlinePlayers.length >= 20
                  ? 'Sẵn sàng bắt đầu! Đang chờ admin...'
                  : `Đang chờ thêm ${20 - onlinePlayers.length} người chơi hoặc admin bắt đầu...`}
              </p>
            </div>
          </div>
        </div>

        {/* Players list */}
        <div className="flex-1 glass-card rounded-2xl p-4 md:p-6">
          <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Người chơi</h2>
          
          <ScrollArea className="h-[calc(100vh-380px)] md:h-[calc(100vh-320px)] lg:h-[calc(100vh-240px)]">
            <div className="space-y-2 pr-2 md:pr-4">
              {/* Online players */}
              {onlinePlayers.map((p, index) => (
                <div
                  key={p.id}
                  className="glass p-3 md:p-4 rounded-xl flex items-center gap-3 md:gap-4 animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div
                    className="w-8 md:w-10 h-8 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold text-background shrink-0"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.nickname.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm md:text-base">
                      {p.nickname}
                      {p.id === player?.id && (
                        <span className="text-primary ml-2 text-xs">(Bạn)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.isReady ? 'Sẵn sàng' : 'Đã tham gia'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Wifi className="w-3 md:w-4 h-3 md:h-4 text-success" />
                    {p.isReady && (
                      <div className="w-2 h-2 rounded-full bg-success" />
                    )}
                  </div>
                </div>
              ))}

              {/* Offline players */}
              {offlinePlayers.length > 0 && (
                <>
                  <div className="text-xs md:text-sm text-muted-foreground mt-4 md:mt-6 mb-2">
                    Ngoại tuyến ({offlinePlayers.length})
                  </div>
                  {offlinePlayers.map((p) => (
                    <div
                      key={p.id}
                      className="glass p-3 md:p-4 rounded-xl flex items-center gap-3 md:gap-4 opacity-50"
                    >
                      <div
                        className="w-8 md:w-10 h-8 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold text-background shrink-0 grayscale"
                        style={{ backgroundColor: p.avatarColor }}
                      >
                        {p.nickname.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm md:text-base">{p.nickname}</p>
                        <p className="text-xs text-muted-foreground">Ngoại tuyến</p>
                      </div>

                      <WifiOff className="w-3 md:w-4 h-3 md:h-4 text-muted-foreground" />
                    </div>
                  ))}
                </>
              )}

              {/* Empty slots */}
              {onlinePlayers.length < 20 && (
                <>
                  <div className="text-xs md:text-sm text-muted-foreground mt-4 md:mt-6 mb-2">
                    Chỗ trống ({20 - players.length})
                  </div>
                  {Array.from({ length: Math.min(5, 20 - players.length) }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="glass p-3 md:p-4 rounded-xl flex items-center gap-3 md:gap-4 opacity-30"
                    >
                      <div className="w-8 md:w-10 h-8 md:h-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground text-xs md:text-sm">?</span>
                      </div>
                      <p className="text-muted-foreground text-xs md:text-sm">Đang chờ người chơi...</p>
                    </div>
                  ))}
                  {20 - players.length > 5 && (
                    <p className="text-center text-xs md:text-sm text-muted-foreground py-2">
                      +{20 - players.length - 5} chỗ trống nữa
                    </p>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
