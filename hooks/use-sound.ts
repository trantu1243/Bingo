'use client';

import { useCallback, useRef } from 'react';

export function useSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playBeep = useCallback((frequency: number = 440, duration: number = 0.1, type: OscillatorType = 'sine') => {
    try {
      const context = getAudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + duration);
    } catch (error) {
      console.log('[v0] Sound error:', error);
    }
  }, [getAudioContext]);

  const playNewNumber = useCallback(() => {
    playBeep(880, 0.15, 'sine');
    setTimeout(() => playBeep(1100, 0.2, 'sine'), 150);
  }, [playBeep]);

  const playWin = useCallback(() => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => playBeep(freq, 0.3, 'sine'), i * 150);
    });
  }, [playBeep]);

  const playClick = useCallback(() => {
    playBeep(600, 0.05, 'square');
  }, [playBeep]);

  const playCountdown = useCallback(() => {
    playBeep(440, 0.1, 'sine');
  }, [playBeep]);

  const playGo = useCallback(() => {
    playBeep(880, 0.3, 'sine');
  }, [playBeep]);

  return {
    playNewNumber,
    playWin,
    playClick,
    playCountdown,
    playGo,
  };
}
