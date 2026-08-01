'use client';

import { useEffect, useRef, useState } from 'react';
import { XIcon } from 'lucide-react';

interface Controls {
  stop: () => void;
}

/**
 * Scan a product barcode with the rear camera (ZXing, loaded on demand), with a
 * manual-entry fallback for devices/browsers where the camera isn't available.
 */
export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let controls: Controls | null = null;
    let cancelled = false;
    let done = false;

    (async () => {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setError('Camera not available here — enter the barcode below.');
        return;
      }
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current!,
          (result) => {
            if (result && !done && !cancelled) {
              done = true;
              onDetected(result.getText());
            }
          },
        );
      } catch {
        if (!cancelled)
          setError('Could not start the camera — enter the barcode below.');
      }
    })();

    return () => {
      cancelled = true;
      try {
        controls?.stop();
      } catch {
        // ignore
      }
    };
  }, [onDetected]);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-semibold">Scan barcode</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 hover:bg-white/10"
          aria-label="Close scanner"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
        />
        {!error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-64 rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/80">
            {error}
          </div>
        )}
      </div>

      {/* Manual entry — always available */}
      <div className="flex gap-2 bg-black px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          placeholder="Or type the barcode number"
          className="h-11 flex-1 rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
        />
        <button
          type="button"
          onClick={() => manual.length >= 6 && onDetected(manual)}
          disabled={manual.length < 6}
          className="h-11 rounded-lg bg-primary-500 px-4 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-40"
        >
          Look up
        </button>
      </div>
    </div>
  );
}
