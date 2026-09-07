import { useEffect, useRef } from 'react';
interface WaveformProps { buffer: AudioBuffer | null; isPlaying: boolean; color?: string; playedColor?: string; height?: number }

/** Cache the waveform twice; playback only blits and clips, with no per-bar blur. */
export default function Waveform({ buffer, isPlaying, color = '#7f8874', playedColor = '#ff7048', height = 64 }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layers = useRef<{ normal: HTMLCanvasElement; played: HTMLCanvasElement } | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const dpr = Math.min(devicePixelRatio, 1.5);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.round(height * dpr);
      const normal = document.createElement('canvas'), played = document.createElement('canvas');
      for (const layer of [normal, played]) { layer.width = canvas.width; layer.height = canvas.height; }
      const a = normal.getContext('2d')!, b = played.getContext('2d')!;
      a.fillStyle = color; b.fillStyle = playedColor;
      if (buffer) {
        const data = buffer.getChannelData(0), mid = canvas.height / 2;
        for (let x = 0; x < canvas.width; x += 2) {
          const start = Math.floor(x / canvas.width * data.length), end = Math.min(data.length, Math.ceil((x+2) / canvas.width * data.length));
          let lo = 0, hi = 0;
          for (let i = start; i < end; i++) { lo = Math.min(lo,data[i]); hi = Math.max(hi,data[i]); }
          for (const ctx of [a,b]) ctx.fillRect(x,mid-hi*mid,1.5,Math.max(1,(hi-lo)*mid));
        }
      }
      layers.current = { normal, played };
      canvas.getContext('2d')?.drawImage(normal,0,0);
    };
    const observer = new ResizeObserver(draw); observer.observe(canvas); draw();
    return () => observer.disconnect();
  }, [buffer,color,playedColor,height]);
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let frame = 0;
    const start = performance.now();
    const tick = () => {
      const layer = layers.current;
      if (layer) {
        ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(layer.normal,0,0);
        if (isPlaying && buffer) {
          const width = Math.min(1,(performance.now()-start)/(buffer.duration*1000)) * canvas.width;
          ctx.save(); ctx.beginPath(); ctx.rect(0,0,width,canvas.height); ctx.clip(); ctx.drawImage(layer.played,0,0); ctx.restore();
        }
      }
      if (isPlaying && buffer && performance.now()-start < buffer.duration*1000) frame = requestAnimationFrame(tick);
    };
    tick(); return () => cancelAnimationFrame(frame);
  }, [buffer,isPlaying,color,playedColor,height]);
  return <canvas ref={canvasRef} className="w-full block" style={{height}} aria-hidden="true" />;
}
