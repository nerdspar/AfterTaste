'use client';

import { useEffect, useState } from 'react';
import { PlayIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isVideoSource } from '@/lib/media';

interface StepMediaProps {
  src: string;
  title: string;
}

export function StepMedia({ src, title }: StepMediaProps) {
  const [open, setOpen] = useState(false);
  const isVideo = isVideoSource(src);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <>
      {/* Thumbnail */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={
          isVideo ? `Play video for ${title}` : `View photo for ${title}`
        }
        className={cn(
          'relative w-24 h-16 rounded-xl overflow-hidden flex-shrink-0 group',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
        )}
      >
        {isVideo ? (
          <video
            src={src}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover dark:brightness-90"
          />
        )}
        {/* Play overlay — only for videos */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
              <PlayIcon className="w-3.5 h-3.5 text-gray-900 fill-gray-900 ml-0.5" />
            </div>
          </div>
        )}
      </button>

      {/* Full-screen lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
          <div className="relative flex max-h-full max-w-4xl items-center justify-center">
            {isVideo ? (
              <video
                src={src}
                className="max-h-[85vh] max-w-full rounded-lg shadow-2xl"
                controls
                autoPlay
                playsInline
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={src}
                alt={title}
                className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
