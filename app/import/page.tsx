'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LoaderIcon, UtensilsCrossedIcon } from 'lucide-react';
import { IMPORT_KEY } from '@/components/aftertaste/ImportRecipeModal';

// Landing target for shared links: the Web Share Target, the iOS Shortcut, and
// clipboard flows all send a recipe URL here. It imports, then hands off to the
// normal review-and-save screen.
function extractUrl(params: URLSearchParams): string {
  const direct = params.get('url');
  if (direct) return direct.trim();
  const text = params.get('text') || params.get('title') || '';
  const match = text.match(/https?:\/\/\S+/);
  return match ? match[0] : '';
}

function ImportHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const url = extractUrl(params);
    if (!url) {
      setError('No recipe link was shared.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/import-recipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || 'Could not import that link.');
          return;
        }
        try {
          sessionStorage.setItem(IMPORT_KEY, JSON.stringify(data.recipe));
        } catch {}
        router.replace('/recipes/new?import=1');
      } catch {
        if (!cancelled) setError('Network error importing that link.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50 dark:bg-[#0B1220]">
      <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center mb-5">
        <UtensilsCrossedIcon className="w-6 h-6 text-white" />
      </div>
      {error ? (
        <>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {error}
          </p>
          <Link
            href="/dashboard"
            className="text-xs font-medium text-primary-600 dark:text-primary-400 mt-2"
          >
            Go to AfterTaste
          </Link>
        </>
      ) : (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <LoaderIcon className="w-4 h-4 animate-spin" />
          Importing recipe…
        </div>
      )}
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense>
      <ImportHandler />
    </Suspense>
  );
}
