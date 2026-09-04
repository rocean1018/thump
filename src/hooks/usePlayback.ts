import { useCallback, useEffect, useRef, useState } from 'react';
import { playBuffer, type PlaybackHandle } from '../audio/playback';

/** Only one thing plays at a time app-wide, tracked by an arbitrary string id. */
export function usePlayback() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const handleRef = useRef<PlaybackHandle | null>(null);

  const stop = useCallback(() => {
    handleRef.current?.stop();
    handleRef.current = null;
    setPlayingId(null);
  }, []);

  const play = useCallback(
    (id: string, buffer: AudioBuffer) => {
      handleRef.current?.stop();
      setPlayingId(id);
      handleRef.current = playBuffer(buffer, () => {
        setPlayingId((current) => (current === id ? null : current));
        handleRef.current = null;
      });
    },
    []
  );

  const toggle = useCallback(
    (id: string, buffer: AudioBuffer) => {
      if (playingId === id) {
        stop();
      } else {
        play(id, buffer);
      }
    },
    [playingId, play, stop]
  );

  useEffect(() => () => handleRef.current?.stop(), []);

  return { playingId, play, stop, toggle };
}
