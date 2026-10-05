import { describe, expect, it } from 'vitest';
import { dueAlerts, alertText, shouldRearm, type AlertableTask } from '@/lib/party-alerts';

const task = (
  over: Partial<AlertableTask> & Pick<AlertableTask, 'id' | 'label'>,
): AlertableTask => ({
  startMin: null,
  dayOffset: 0,
  done: false,
  passive: false,
  alerted: false,
  ...over,
});

const at = (h: number, m = 0) => h * 60 + m;

describe('which steps should buzz a phone', () => {
  const turkey = task({ id: 't1', label: 'Turkey in the oven', startMin: at(13) });

  it('fires once the warning time is reached', () => {
    expect(dueAlerts([turkey], at(12, 50), 10).map((t) => t.id)).toEqual(['t1']);
  });

  it('stays quiet before then', () => {
    expect(dueAlerts([turkey], at(12, 49), 10)).toEqual([]);
  });

  it('fires at the time itself when no warning was asked for', () => {
    expect(dueAlerts([turkey], at(12, 59), 0)).toEqual([]);
    expect(dueAlerts([turkey], at(13), 0)).toHaveLength(1);
  });

  it('gives up once it is too late to be a reminder', () => {
    // An hour after the fact is not a reminder, it is an accusation — and it
    // means the whole schedule has drifted, which is a thing to look at.
    expect(dueAlerts([turkey], at(14), 10)).toEqual([]);
  });

  it('never fires twice for the same step', () => {
    const already = { ...turkey, alerted: true };
    expect(dueAlerts([already], at(13), 10)).toEqual([]);
  });

  it('says nothing about work already ticked off', () => {
    const done = { ...turkey, done: true };
    expect(dueAlerts([done], at(13), 10)).toEqual([]);
  });
});

describe('what must never buzz', () => {
  it('ignores a step with no time yet', () => {
    // "Order the pie" is a real plan item and not an instruction for a moment.
    const loose = task({ id: 'x', label: 'Order the pie' });
    expect(dueAlerts([loose], at(13), 10)).toEqual([]);
  });

  it('ignores work on another day', () => {
    // The Friday page is not today's alarm clock.
    const yesterday = task({ id: 'y', label: 'Brine the turkey', startMin: at(18), dayOffset: -1 });
    expect(dueAlerts([yesterday], at(18), 0)).toEqual([]);
  });
});

describe('what should buzz but might be forgotten', () => {
  it('alerts a hands-off step', () => {
    // Taking the dough out of the fridge is exactly what gets forgotten, and
    // the fact that it needs no attention afterwards is why.
    const dough = task({
      id: 'd',
      label: 'Dough out of the fridge',
      startMin: at(15),
      passive: true,
    });

    expect(dueAlerts([dough], at(15), 0)).toHaveLength(1);
  });
});

describe('alert order', () => {
  it('runs earliest first when several come due at once', () => {
    const tasks = [
      task({ id: 'b', label: 'Second', startMin: at(13, 10) }),
      task({ id: 'a', label: 'First', startMin: at(13) }),
    ];

    expect(dueAlerts(tasks, at(13, 10), 10).map((t) => t.id)).toEqual(['a', 'b']);
  });
});

describe('what the alert says', () => {
  it('counts down while there is still warning', () => {
    const t = task({ id: 't', label: 'Turkey in', startMin: at(13) });
    expect(alertText(t, at(12, 50), 'Friendsgiving').title).toBe('Turkey in, in 10 min');
  });

  it('says "now" rather than "in 0 minutes"', () => {
    const t = task({ id: 't', label: 'Turkey in', startMin: at(13) });
    expect(alertText(t, at(13), 'Friendsgiving').title).toBe('Turkey in, now');
  });

  it('admits when it is late', () => {
    const t = task({ id: 't', label: 'Turkey in', startMin: at(13) });
    expect(alertText(t, at(13, 5), 'Friendsgiving').title).toBe('Turkey in, 5 min ago');
  });

  it('names the dish, since the step alone can be ambiguous', () => {
    const t = task({ id: 't', label: 'In the oven', startMin: at(13), dishName: 'Stuffing' });
    expect(alertText(t, at(13), 'Friendsgiving').title).toBe('In the oven — Stuffing, now');
  });

  it('puts the party in the body, for when several things are going on', () => {
    const t = task({ id: 't', label: 'Turkey in', startMin: at(13) });
    expect(alertText(t, at(13), 'Friendsgiving 2026').body).toBe('Friendsgiving 2026');
  });
});

describe('re-arming a step that moves', () => {
  it('re-arms when the time changes', () => {
    // Otherwise a step nudged an hour later is silently spent.
    expect(shouldRearm({ at: '14:00' })).toBe(true);
    expect(shouldRearm({ at: null })).toBe(true);
    expect(shouldRearm({ dayOffset: -1 })).toBe(true);
  });

  it('leaves it alone for anything else', () => {
    expect(shouldRearm({})).toBe(false);
  });
});
