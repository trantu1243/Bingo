'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/lib/socket-context';
import { Button } from '@/components/ui/button';
import { Clock, Lock, Shuffle, Check } from 'lucide-react';
import { toast } from 'sonner';

export function BoardSetup() {
  const { player, game, submitBoard, updateBoardPosition } = useSocket();
  const [board, setBoard] = useState<(number | null)[]>(Array(25).fill(null));
  const [availableNumbers, setAvailableNumbers] = useState<number[]>(
    Array.from({ length: 25 }, (_, i) => i + 1)
  );
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(180);
  const [isLocked, setIsLocked] = useState(false);

  // Calculate time left
  useEffect(() => {
    if (!game.setupEndTime) return;

    const updateTime = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((game.setupEndTime! - now) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0 && !isLocked) {
        handleAutoComplete();
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [game.setupEndTime, isLocked]);

  // Initialize board from player data
  useEffect(() => {
    if (player?.boardNumbers && player.boardNumbers.length === 25) {
      setBoard(player.boardNumbers);
      setAvailableNumbers([]);
      setIsLocked(player.isBoardLocked);
    }
  }, [player]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCellClick = (index: number) => {
    if (isLocked) return;

    // If cell already has a number, remove it and return to available
    if (board[index] !== null) {
      const number = board[index]!;
      const newBoard = [...board];
      newBoard[index] = null;
      setBoard(newBoard);
      setAvailableNumbers(prev => [...prev, number].sort((a, b) => a - b));
      updateBoardPosition(newBoard.map(n => n ?? 0));
      return;
    }

    // If a number is selected and cell is empty, place it
    if (selectedNumber !== null) {
      const newBoard = [...board];
      newBoard[index] = selectedNumber;
      setBoard(newBoard);
      setAvailableNumbers(prev => prev.filter(n => n !== selectedNumber));
      setSelectedNumber(null);
      updateBoardPosition(newBoard.map(n => n ?? 0));
    }
  };

  const handleNumberClick = (number: number) => {
    if (isLocked) return;
    
    // If clicking the same number, deselect it
    if (selectedNumber === number) {
      setSelectedNumber(null);
      return;
    }
    
    // Find first empty cell and place the number directly
    const emptyIndex = board.findIndex(n => n === null);
    if (emptyIndex !== -1) {
      const newBoard = [...board];
      newBoard[emptyIndex] = number;
      setBoard(newBoard);
      setAvailableNumbers(prev => prev.filter(n => n !== number));
      updateBoardPosition(newBoard.map(n => n ?? 0));
    } else {
      // No empty cells, just select the number
      setSelectedNumber(number);
    }
  };

  const handleRandomize = () => {
    if (isLocked) return;

    const allNumbers = Array.from({ length: 25 }, (_, i) => i + 1);
    const shuffled = [...allNumbers].sort(() => Math.random() - 0.5);
    setBoard(shuffled);
    setAvailableNumbers([]);
    setSelectedNumber(null);
    updateBoardPosition(shuffled);
    toast.success('Đã xáo trộn bảng!');
  };

  const handleAutoComplete = useCallback(() => {
    if (isLocked) return;

    const newBoard = [...board];
    const usedNumbers = new Set(newBoard.filter(n => n !== null));
    const remaining = Array.from({ length: 25 }, (_, i) => i + 1)
      .filter(n => !usedNumbers.has(n))
      .sort(() => Math.random() - 0.5);

    let remainingIndex = 0;
    for (let i = 0; i < 25; i++) {
      if (newBoard[i] === null && remainingIndex < remaining.length) {
        newBoard[i] = remaining[remainingIndex];
        remainingIndex++;
      }
    }

    setBoard(newBoard);
    setAvailableNumbers([]);
    setIsLocked(true);
    submitBoard(newBoard as number[]);
    toast.success('Bảng đã được khóa!');
  }, [board, isLocked, submitBoard]);

  const handleSubmit = () => {
    if (board.some(n => n === null)) {
      toast.error('Vui lòng điền tất cả các ô');
      return;
    }

    setIsLocked(true);
    submitBoard(board as number[]);
    toast.success('Đã gửi bảng!');
  };

  const isBoardComplete = board.every(n => n !== null);

  return (
    <div className="min-h-screen flex flex-col p-3 md:p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-60 md:w-80 h-60 md:h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-60 md:w-80 h-60 md:h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="text-center md:text-left">
          <h1 className="text-xl md:text-3xl font-bold text-primary">
            Thiết lập bảng
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm">
            {isLocked 
              ? 'Bảng của bạn đã khóa. Đang chờ trò chơi bắt đầu...'
              : 'Nhấn số để điền vào bảng'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4">
          {/* Timer */}
          <div className={`glass px-4 md:px-6 py-2 md:py-3 rounded-full flex items-center gap-2 md:gap-3 ${
            timeLeft <= 30 ? 'border-destructive/50 text-destructive' : ''
          }`}>
            <Clock className={`w-4 md:w-5 h-4 md:h-5 ${timeLeft <= 30 ? 'animate-pulse' : ''}`} />
            <span className="font-mono text-lg md:text-xl font-bold">{formatTime(timeLeft)}</span>
          </div>

          {/* Lock status */}
          {isLocked && (
            <div className="glass px-3 md:px-4 py-1.5 md:py-2 rounded-full flex items-center gap-2 bg-success/20 border-success/50">
              <Lock className="w-3 md:w-4 h-3 md:h-4 text-success" />
              <span className="text-success text-xs md:text-sm font-medium">Đã khóa</span>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-4 md:gap-6 items-center justify-center">
        {/* Bingo Board */}
        <div className="w-full max-w-[320px] md:max-w-[400px] lg:max-w-[450px]">
          <div className="glass-card rounded-2xl p-3 md:p-6">
            <div className="grid grid-cols-5 gap-1.5 md:gap-2">
              {board.map((number, index) => (
                <button
                  key={index}
                  onClick={() => handleCellClick(index)}
                  disabled={isLocked}
                  className={`
                    aspect-square bingo-cell text-base md:text-xl
                    ${number !== null ? 'bg-primary/20 border-primary/50 text-primary' : ''}
                    ${selectedNumber !== null && number === null ? 'border-primary/50 border-dashed' : ''}
                    ${isLocked ? 'cursor-not-allowed opacity-75' : ''}
                  `}
                >
                  {number}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Number picker and controls */}
        <div className="w-full max-w-[320px] md:max-w-[400px] lg:max-w-[300px] space-y-4 md:space-y-6">
          {/* Available numbers */}
          {!isLocked && (
            <div className="glass-card rounded-2xl p-3 md:p-4">
              <h3 className="text-xs md:text-sm font-medium text-muted-foreground mb-2 md:mb-3">
                Số còn lại
                {selectedNumber && (
                  <span className="ml-2 text-primary">
                    (Đã chọn: {selectedNumber})
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-5 gap-1.5 md:gap-2">
                {Array.from({ length: 25 }, (_, i) => i + 1).map((number) => {
                  const isAvailable = availableNumbers.includes(number);
                  const isSelected = selectedNumber === number;
                  
                  return (
                    <button
                      key={number}
                      onClick={() => isAvailable && handleNumberClick(number)}
                      disabled={!isAvailable}
                      className={`
                        aspect-square number-picker-item text-xs md:text-sm
                        ${isSelected ? 'selected' : ''}
                        ${!isAvailable ? 'used' : ''}
                      `}
                    >
                      {number}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="glass-card rounded-2xl p-3 md:p-4 space-y-2 md:space-y-3">
            {!isLocked ? (
              <>
                <Button
                  onClick={handleRandomize}
                  variant="outline"
                  className="w-full h-10 md:h-12 gap-2 text-sm md:text-base"
                >
                  <Shuffle className="w-4 h-4" />
                  Xáo trộn ngẫu nhiên
                </Button>

                <Button
                  onClick={handleSubmit}
                  disabled={!isBoardComplete}
                  className="w-full h-10 md:h-12 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm md:text-base"
                >
                  <Check className="w-4 h-4" />
                  Khóa bảng
                </Button>
              </>
            ) : (
              <div className="text-center py-3 md:py-4">
                <Lock className="w-6 md:w-8 h-6 md:h-8 text-success mx-auto mb-2" />
                <p className="text-xs md:text-sm text-muted-foreground">
                  Bảng của bạn đã khóa và sẵn sàng!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Đang chờ người chơi khác...
                </p>
              </div>
            )}
          </div>

          {/* Instructions */}
          {!isLocked && (
            <div className="glass p-3 md:p-4 rounded-xl text-xs md:text-sm text-muted-foreground space-y-1.5 md:space-y-2">
              <p>1. Nhấn số để tự động điền vào ô</p>
              <p>2. Nhấn vào ô để xóa số</p>
              <p>3. Dùng Xáo trộn để thiết lập nhanh</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
