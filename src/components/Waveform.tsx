import { useEffect, useRef } from 'react';

interface WaveformProps {
  buffer: AudioBuffer | null;
  isPlaying: boolean;
  color?: string;
  playedColor?: string;
  height?: number;
}

/** Draws a min/max peak waveform to canvas and animates a playhead while playing. */
export default function Waveform({
  buffer,
  isPlaying,
  color = 'rgba(255,255,255,0.35)',
  playedColor = '#ff8a5c',
  height = 64,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !buffer) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssWidth = canvas.clientWidth || 300;
    canvas.width = cssWidth * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = buffer.getChannelData(0);
    const width = canvas.width;
    const step = Math.max(1, Math.floor(data.length / width));
    const mid = canvas.height / 2;
    const peaks: { min: number; max: number }[] = [];
    for (let x = 0; x < width; x++) {
      let min = 1;
      let max = -1;
      const start = x * step;
      const end = Math.min(data.length, start + step);
      for (let i = start; i < end; i++) {
        const v = data[i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      if (start >= data.length) {
        min = 0;
        max = 0;
      }
      peaks.push({ min, max });
    }

    function draw(progress: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      const playedX = Math.floor(progress * width);
      for (let x = 0; x < width; x++) {
        const { min, max } = peaks[x];
        const barHeight = Math.max(1, (max - min) * mid);
        ctx.fillStyle = x <= playedX ? playedColor : color;
        ctx.fillRect(x, mid - Math.max(max * mid, 0.5), 1, barHeight);
      }
    }

    if (!isPlaying) {
      draw(0);
      return;
    }

    startTimeRef.current = performance.now();
    const duration = buffer.duration * 1000;
    function tick() {
      const elapsed = performance.now() - startTimeRef.current;
      const progress = Math.min(1, elapsed / duration);
      draw(progress);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    tick();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [buffer, isPlaying, color, playedColor, height]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full block"
      style={{ height }}
      aria-hidden="true"
    />
  );
}
