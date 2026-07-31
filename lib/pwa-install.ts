'use client';

import { useSyncExternalStore } from 'react';

// Captures the (Chromium) beforeinstallprompt event so a Settings button can
// trigger the native install prompt. iOS never fires this — callers fall back
// to "Add to Home Screen" instructions there.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let initialized = false;
let listeners: Array<() => void> = [];

function emit() {
  for (const l of listeners) l();
}

export function initInstallCapture() {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const choice = await deferred.userChoice;
  deferred = null;
  emit();
  return choice.outcome === 'accepted';
}

function subscribe(l: () => void) {
  listeners = [...listeners, l];
  return () => {
    listeners = listeners.filter((x) => x !== l);
  };
}

export function useInstallAvailable(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => deferred !== null,
    () => false,
  );
}
