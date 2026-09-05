/**
 * useCamera — stable getUserMedia hook with proper cleanup
 *
 * Handles permission, stream lifecycle, and graceful fallback.
 * Always release tracks on unmount to prevent the browser camera light staying on.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable' | 'error';

export interface UseCameraOptions {
  /** Auto-start when the hook mounts (default true) */
  autoStart?: boolean;
  /** Preferred facing mode (default 'environment' for back camera) */
  facingMode?: 'environment' | 'user';
  /** Ideal resolution */
  width?: number;
  height?: number;
}

export interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: CameraStatus;
  error: string | null;
  hasStream: boolean;
  torchSupported: boolean;
  torchOn: boolean;
  start: () => Promise<void>;
  stop: () => void;
  toggleTorch: () => Promise<boolean>;
  /** Capture a still frame as ImageData from current video */
  capture: () => ImageData | null;
}

type TorchTrack = MediaStreamTrack & {
  getCapabilities?: () => MediaTrackCapabilities & { torch?: boolean };
};

export function useCamera({
  autoStart = false,
  facingMode = 'environment',
  width = 1280,
  height = 720,
}: UseCameraOptions = {}): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasStream, setHasStream] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setHasStream(false);
    setStatus('idle');
    setTorchSupported(false);
    setTorchOn(false);
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable');
      setError('Camera API not supported in this browser');
      return;
    }

    // Camera APIs require a secure context (HTTPS or localhost).
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setStatus('unavailable');
      setError('Camera requires HTTPS');
      return;
    }

    try {
      setStatus('requesting');
      setError(null);

      if (streamRef.current?.active) {
        setHasStream(true);
        setStatus('ready');
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: width },
            height: { ideal: height },
          },
          audio: false,
        });
      } catch (err) {
        const e = err as DOMException;
        if (e?.name !== 'OverconstrainedError') throw err;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      setHasStream(true);

      const videoTrack = stream.getVideoTracks()[0] as TorchTrack | undefined;
      setTorchSupported(videoTrack?.getCapabilities?.().torch === true);

      if (videoRef.current) {
        const video = videoRef.current;
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = stream;
        // Required on iOS Safari for inline playback
        video.setAttribute('playsinline', 'true');
        video.muted = true;
        try {
          await video.play();
        } catch (playError) {
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          setHasStream(false);
          setStatus('error');
          setError('Camera opened, but video playback was blocked. Tap Enable Camera again.');
          console.warn('Camera video play failed', playError);
          return;
        }
      }

      setStatus('ready');
    } catch (err) {
      const e = err as DOMException;
      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
        setStatus('denied');
        setError('Camera permission denied');
      } else if (e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError') {
        setStatus('unavailable');
        setError('No camera found');
      } else {
        setStatus('error');
        setError(e?.message || 'Failed to start camera');
      }
    }
  }, [facingMode, width, height]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0] as TorchTrack | undefined;
    if (!track || !torchSupported) return false;

    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet & { torch: boolean }],
      });
      setTorchOn(next);
      return true;
    } catch (torchError) {
      console.warn('Camera torch is not available', torchError);
      setTorchSupported(false);
      setTorchOn(false);
      return false;
    }
  }, [torchOn, torchSupported]);

  const capture = useCallback((): ImageData | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    if (autoStart) {
      void start();
    }
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(
    () => ({
      videoRef,
      status,
      error,
      hasStream,
      torchSupported,
      torchOn,
      start,
      stop,
      toggleTorch,
      capture,
    }),
    [status, error, hasStream, torchSupported, torchOn, start, stop, toggleTorch, capture],
  );
}
