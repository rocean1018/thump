import { useEffect, useRef } from 'react';
import { getMasterChain } from '../audio/playback';

/**
 * Full-bleed segmented spectrum meter anchored to the bottom of the viewport —
 * reads as hardware EQ/VU metering rather than decorative rays. Reacts to
 * whatever is actually playing through the shared master analyser. Purely
 * decorative (aria-hidden, pointer-events: none), disabled under
 * prefers-reduced-motion.
 */
export default function AudioReactiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const COLS = 56;
    const CELL_H = 7;
    const CELL_GAP = 3;
    const smoothed = new Float32Array(COLS);

    function drawStatic() {
      if (!ctx || !canvas) return;
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const g = ctx.createLinearGradient(0, height, 0, height * 0.55);
      g.addColorStop(0, 'rgba(255,67,16,0.06)');
      g.addColorStop(1, 'rgba(10,9,8,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, height * 0.55, width, height * 0.45);
    }

    if (reduceMotion) {
      drawStatic();
      return () => window.removeEventListener('resize', resize);
    }

    let raf = 0;
    let t = 0;

    function frame() {
      const canvasEl = canvasRef.current;
      if (!canvasEl || !ctx) return;
      const { width, height } = canvasEl;
      ctx.clearRect(0, 0, width, height);

      let bytes: Uint8Array<ArrayBuffer> | null = null;
      try {
        const { analyser } = getMasterChain();
        bytes = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(bytes);
      } catch {
        bytes = null;
      }

      t += 0.02;
      const colWidth = width / COLS;
      const maxCells = Math.floor(height * 0.5 / (CELL_H + CELL_GAP));

      for (let i = 0; i < COLS; i++) {
        const idle = (Math.sin(t + i * 0.5) * 0.5 + 0.5) * 0.06;
        let energy = idle;
        if (bytes) {
          const binIndex = Math.floor((i / COLS) * bytes.length * 0.7);
          energy = Math.max(idle, (bytes[binIndex] ?? 0) / 255);
        }
        smoothed[i] += (energy - smoothed[i]) * 0.3;

        const cells = Math.round(smoothed[i] * maxCells);
        const x = i * colWidth;
        for (let c = 0; c < cells; c++) {
          const frac = c / maxCells;
          const y = height - (c + 1) * (CELL_H + CELL_GAP);
          const isHot = frac > 0.72;
          const alpha = 0.1 + frac * 0.35;
          ctx.fillStyle = isHot ? `rgba(215,255,63,${alpha})` : `rgba(255,67,16,${alpha})`;
          ctx.fillRect(x + 1, y, colWidth - 2, CELL_H);
        }
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 -z-10 pointer-events-none" />;
}
