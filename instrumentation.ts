// Next runs this once per server process, which is where the notification
// scheduler belongs: it has to outlive any single request.
//
// Guarded to the Node runtime — the Edge runtime has no timers that survive a
// request and no database connection to poll with.

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { startNotificationScheduler } = await import(
    '@/lib/notification-scheduler'
  );
  startNotificationScheduler();
}
