import { Logo } from '@/components/aftertaste/Logo';

// Standalone shell for the auth pages — no sidebar, no data providers.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-gradient-to-b from-primary-50 to-white dark:from-slate-950 dark:to-[#0B1220]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <Logo className="w-12 h-12 drop-shadow-sm" />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            AfterTaste
          </h1>
        </div>
        {children}
      </div>
    </div>
  );
}
