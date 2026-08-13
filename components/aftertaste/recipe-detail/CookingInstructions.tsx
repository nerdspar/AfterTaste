import { SectionHeader } from '../SectionHeader';
import { StepMedia } from './StepMedia';
import { isGenericStepTitle } from '@/lib/recipe-parser';
import type { Instruction } from '@/data/sample/recipes';

interface CookingInstructionsProps {
  instructions: Instruction[];
}

export function CookingInstructions({ instructions }: CookingInstructionsProps) {
  // Step numbering restarts after each section header.
  let stepNum = 0;

  return (
    <section>
      <SectionHeader title="Cooking Instructions" />

      <div className="space-y-3">
        {instructions.map((inst, idx) => {
          if (inst.section !== undefined) {
            stepNum = 0;
            return (
              <h4
                key={idx}
                className="pt-3 first:pt-0 text-sm font-bold text-gray-900 dark:text-gray-100"
              >
                {inst.section}
              </h4>
            );
          }

          stepNum += 1;
          return (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700/40 dark:bg-slate-900"
            >
              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-primary-500 dark:text-primary-400 tabular-nums mb-0.5">
                  Step {String(stepNum).padStart(2, '0')}
                </p>
                {!isGenericStepTitle(inst.title) && (
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                    {inst.title}
                  </h4>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap">
                  {inst.body}
                </p>
              </div>

              {/* Photo/video — only shown when one has been uploaded for this step */}
              {inst.videoThumb && (
                <StepMedia src={inst.videoThumb} title={inst.title} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
