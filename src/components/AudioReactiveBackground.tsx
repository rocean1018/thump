import { useEffect, useRef } from 'react';
import { getMasterChain } from '../audio/playback';

/**
 * Full-bleed ambient background reacting to whatever is actually playing
 * through the shared master analyser. Purely decorative (aria-hidden,
 * pointer-events: none) and disabled under prefers-reduced-motion.
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

    if (reduceMotion) {
      const { width, height } = canvas;
      const g = ctx.createRadialGradient(width / 2, height * 0.35, 0, width / 2, height * 0.35, height * 0.8);
      g.addColorStop(0, 'rgba(255,90,60,0.10)');
      g.addColorStop(1, 'rgba(8,9,12,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      return () => window.removeEventListener('resize', resize);
    }

    let raf = 0;
    let t = 0;
    const bars = 64;
    const smoothed = new Float32Array(bars);

    function frame() {
      const canvasEl = canvasRef.current;
      if (!canvasEl || !ctx) return;
      const { width, height } = canvasEl;
      const cx = width / 2;
      const cy = height * 0.42;
      const baseRadius = Math.min(width, height) * 0.18;

      let bytes: Uint8Array<ArrayBuffer> | null = null;
      try {
        const { analyser } = getMasterChain();
        bytes = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(bytes);
      } catch {
        bytes = null;
      }

      ctx.clearRect(0, 0, width, height);
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.75);
      bg.addColorStop(0, 'rgba(255,90,60,0.09)');
      bg.addColorStop(0.5, 'rgba(110,231,255,0.03)');
      bg.addColorStop(1, 'rgba(8,9,12,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      t += 0.006;
      for (let i = 0; i < bars; i++) {
        const angle = (i / bars) * Math.PI * 2;
        const idleWobble = Math.sin(t * 2 + i * 0.35) * 0.5 + 0.5;
        let energy = idleWobble * 0.12;
        if (bytes) {
          const binIndex = Math.floor((i / bars) * bytes.length * 0.6);
          energy = Math.max(energy, (bytes[binIndex] ?? 0) / 255);
        }
        smoothed[i] += (energy - smoothed[i]) * 0.25;

        const len = baseRadius * (0.35 + smoothed[i] * 1.6);
        const x1 = cx + Math.cos(angle) * baseRadius;
        const y1 = cy + Math.sin(angle) * baseRadius;
        const x2 = cx + Math.cos(angle) * (baseRadius + len);
        const y2 = cy + Math.sin(angle) * (baseRadius + len);

        const hue = smoothed[i] > 0.5 ? 'rgba(255,138,92,' : 'rgba(110,231,255,';
        ctx.strokeStyle = `${hue}${0.15 + smoothed[i] * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none"
    />
  );
}
