import { describe, expect, it } from 'vitest';
import { seedTasksFromSteps } from '@/lib/party-seed-tasks';
import type { Instruction } from '@/data/sample/recipes';

const step = (title: string, body: string): Instruction => ({
  step: '01',
  title,
  body,
  videoThumb: '',
});

const header = (section: string): Instruction =>
  ({ section, step: '', title: '', body: '', videoThumb: '' }) as Instruction;

describe('which recipe steps earn a place on the day', () => {
  it('takes a step that holds the oven', () => {
    const [task] = seedTasksFromSteps([
      step('Roast the turkey', 'Roast at 325°F for 3 hours, basting every 45 minutes.'),
    ]);

    expect(task.label).toBe('Roast the turkey');
    expect(task.resource).toBe('oven');
    expect(task.ovenTempF).toBe(325);
    expect(task.durationMin).toBe(180);
  });

  it('leaves knife work in the recipe', () => {
    // "Chop the onion" takes as long as it takes and collides with nothing.
    expect(
      seedTasksFromSteps([step('Prep the vegetables', 'Dice the onion and celery finely.')]),
    ).toEqual([]);
  });

  it('takes a wait, which is the whole reason to start early', () => {
    const [task] = seedTasksFromSteps([
      step('Rest the bird', 'Let the turkey rest for 40 minutes before carving.'),
    ]);

    expect(task.passive).toBe(true);
    expect(task.durationMin).toBe(40);
    // Resting holds the counter, not the oven — it must not create a clash.
    expect(task.resource).toBe('none');
    expect(task.ovenTempF).toBeNull();
  });

  it('takes a burner step', () => {
    const [task] = seedTasksFromSteps([
      step('Make the gravy', 'Simmer the stock for 25 minutes until reduced.'),
    ]);

    expect(task.resource).toBe('burner');
    expect(task.durationMin).toBe(25);
  });

  it('returns nothing for a recipe of pure assembly', () => {
    // Which is the right answer: that dish needs shopping, not a slot.
    expect(
      seedTasksFromSteps([
        step('Arrange', 'Lay the slices on a board.'),
        step('Serve', 'Scatter with parsley and serve.'),
      ]),
    ).toEqual([]);
  });

  it('skips section headers', () => {
    const seeded = seedTasksFromSteps([
      header('For the stuffing'),
      step('Bake it', 'Bake for 45 minutes at 375 degrees.'),
    ]);

    expect(seeded).toHaveLength(1);
  });
});

describe('reading the oven temperature', () => {
  it('ignores a number that is not a temperature', () => {
    const [task] = seedTasksFromSteps([
      step('Bake the cookies', 'Bake 24 cookies for 12 minutes.'),
    ]);

    // 24 is a count, not a setting — and 12 minutes is not degrees either.
    expect(task.ovenTempF).toBeNull();
    expect(task.durationMin).toBe(12);
  });

  it('refuses a number outside any sane oven', () => {
    const [task] = seedTasksFromSteps([
      step('Bake', 'Bake for 20 minutes. Serves 900 people at the hall.'),
    ]);

    expect(task.ovenTempF).toBeNull();
  });

  it('does not put a temperature on a step that is not using the oven', () => {
    const [task] = seedTasksFromSteps([
      step('Simmer', 'Simmer for 30 minutes, stirring at 350 strokes a minute.'),
    ]);

    expect(task.resource).toBe('burner');
    expect(task.ovenTempF).toBeNull();
  });
});

describe('durations', () => {
  it('takes the low end of a range, as the step timers do', () => {
    const [task] = seedTasksFromSteps([
      step('Bake', 'Bake for 40-50 minutes until golden.'),
    ]);

    // Checking early and adding time is how cooking works.
    expect(task.durationMin).toBe(40);
  });

  it('takes the longest duration when a step has several', () => {
    const [task] = seedTasksFromSteps([
      step('Braise', 'Sear for 5 minutes, then braise for 2 hours.'),
    ]);

    expect(task.durationMin).toBe(120);
  });
});

describe('a dish cooked more than once', () => {
  it('gives each turkey its own run through the oven', () => {
    const seeded = seedTasksFromSteps(
      [step('Roast the turkey', 'Roast at 325°F for 3 hours.')],
      { instances: 2 },
    );

    expect(seeded).toHaveLength(2);
    expect(seeded.map((t) => t.instance)).toEqual([1, 2]);
  });

  it('treats a single instance as one run', () => {
    const seeded = seedTasksFromSteps(
      [step('Roast', 'Roast for 1 hour.')],
      { instances: 1 },
    );

    expect(seeded).toHaveLength(1);
    expect(seeded[0].instance).toBe(1);
  });
});

describe('labels', () => {
  it('prefers the step title, which is what a run of show can be read at', () => {
    const [task] = seedTasksFromSteps([
      step('Turkey in', 'Place the bird in the oven and roast for 3 hours at 325 degrees.'),
    ]);

    expect(task.label).toBe('Turkey in');
  });

  it('falls back to the first sentence, trimmed', () => {
    const [task] = seedTasksFromSteps([
      step('', 'Bake for 45 minutes at 375 degrees. Then let it stand before serving.'),
    ]);

    expect(task.label).toBe('Bake for 45 minutes at 375 degrees.');
  });

  it('does not let a long sentence become the row', () => {
    const long = `Bake for 45 minutes ${'and keep an eye on it '.repeat(6)}`;
    const [task] = seedTasksFromSteps([step('', long)]);

    expect(task.label.length).toBeLessThanOrEqual(60);
    expect(task.label.endsWith('…')).toBe(true);
  });
});
