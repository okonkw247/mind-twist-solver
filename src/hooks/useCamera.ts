/**
 * useCamera — stable getUserMedia hook with proper cleanup
 *
 * Handles permission, stream lifecycle, and graceful fallback.
 * Always release tracks on unmount to prevent the browser camera light staying on.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

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
  start: () => Promise<void>;
  stop: () => void;
  /** Capture a still frame as ImageData from current video */
  capture: () => ImageData | null;
}

export function useCamera({
  autoStart = true,
  facingMode = 'environment',
  width = 1280,
  height = 720,
}: UseCameraOptions = {}): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
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

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Required on iOS Safari for inline playback
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch {
          // play() can reject if user has not interacted; we still treat as ready
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

  const capture = useCallback((): ImageData | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
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

  return { videoRef, status, error, start, stop, capture };
}
