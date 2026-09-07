import type { ReactNode } from 'react';
export default function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    play: <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none" />,
    pause: <path d="M8 5v14M16 5v14" strokeWidth="3" />,
    stop: <rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" stroke="none" />,
    check: <path d="m5 12 4 4L19 6" />,
    'arrow-small': <path d="M5 12h13m-5-5 5 5-5 5" />,
    spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" /><path d="M20 2v4m-2-2h4" /></>,
    loading: <path d="M20 12a8 8 0 1 1-8-8" />,
    upload: <path d="M12 16V4m-4 4 4-4 4 4M5 16v4h14v-4" />,
    download: <path d="M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    '808': <><path d="M2 12c3-12 7-12 10 0s7 12 10 0" /><path d="M2 17h20" opacity=".3" /></>,
    kick: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
    hihat: <path d="m3 10 9-5 9 5H3Zm0 4h18M12 14v7m-4 0h8" />,
    snare: <><ellipse cx="12" cy="7" rx="9" ry="3" /><path d="M3 7v9c0 4 18 4 18 0V7M7 10v8m10-8v8M5 2l13 4" /></>,
  };
  return <svg className={name === 'loading' ? 'spin' : undefined} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.spark}</svg>;
}
