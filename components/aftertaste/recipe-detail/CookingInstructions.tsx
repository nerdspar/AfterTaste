import { cn } from '@/lib/utils';
import { PlayIcon } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import type { Instruction } from '@/data/sample/recipes';

interface CookingInstructionsProps {
  instructions: Instruction[];
}

export function CookingInstructions({ instructions }: CookingInstructionsProps) {
  return (
    <section>
      <SectionHeader title="Cooking Instructions" />

      <div className="space-y-3">
        {instructions.map((inst) => (
          <div
            key={inst.step}
            className={cn(
              'flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3',
              'dark:border-gray-700/40 dark:bg-slate-900',
            )}
          >
            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-primary-500 dark:text-primary-400 tabular-nums mb-0.5">
                Step {inst.step}
              </p>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                {inst.title}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {inst.body}
              </p>
            </div>

            {/* Thumbnail — only shown when one has been uploaded for this step */}
            {inst.videoThumb && (
              <div className="relative w-24 h-16 rounded-xl overflow-hidden flex-shrink-0 group cursor-pointer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={inst.videoThumb}
                  alt={inst.title}
                  className="absolute inset-0 w-full h-full object-cover dark:brightness-90"
                />
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                    <PlayIcon className="w-3.5 h-3.5 text-gray-900 fill-gray-900 ml-0.5" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
