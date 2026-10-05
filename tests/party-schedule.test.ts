import { describe, expect, it } from 'vitest';
import {
  parseClock,
  formatClock,
  layBackFrom,
  findClashes,
  ovenLanes,
  groupByDay,
  timelineWindow,
  barGeometry,
  packRows,
  type ScheduledTask,
} from '@/lib/party-schedule';

const task = (
  over: Partial<ScheduledTask> & Pick<ScheduledTask, 'id' | 'label'>,
): ScheduledTask => ({
  dayOffset: 0,
  startMin: null,
  durationMin: 0,
  passive: false,
  resource: 'none',
  ...over,
});

const at = (clock: string) => parseClock(clock) as number;

describe('clock parsing', () => {
  it('reads and writes a wall clock', () => {
    expect(parseClock('17:30')).toBe(1050);
    expect(parseClock('07:00')).toBe(420);
    expect(formatClock(1050)).toBe('17:30');
    expect(formatClock(420)).toBe('07:00');
  });

  it('refuses nonsense rather than guessing', () => {
    for (const bad of ['', 'half five', '25:00', '12:70', null, undefined]) {
      expect(parseClock(bad as string)).toBeNull();
    }
  });
});

describe('laying tasks back from the serve time', () => {
  it('ends the last task exactly on the table', () => {
    // Dough out of the fridge, bake, reheat — serving at 19:00.
    const placed = layBackFrom(at('19:00'), [
      { id: 'out', durationMin: 120 },
      { id: 'bake', durationMin: 18 },
      { id: 'reheat', durationMin: 6 },
    ]);
    expect(formatClock(placed.get('reheat') as number)).toBe('18:54');
    expect(formatClock(placed.get('bake') as number)).toBe('18:36');
    expect(formatClock(placed.get('out') as number)).toBe('16:36');
  });
});

describe('oven clashes', () => {
  it('flags two temperatures in one oven', () => {
    // Friendsgiving's 4pm: apps want 400° while turkey 2 is still in at 325°.
    const clashes = findClashes([
      task({ id: 't2', label: 'Turkey 2', startMin: at('12:00'), durationMin: 300, resource: 'oven', ovenTempF: 325 }),
      task({ id: 'apps', label: 'Apps', startMin: at('16:00'), durationMin: 20, resource: 'oven', ovenTempF: 400 }),
    ]);
    expect(clashes).toHaveLength(1);
    expect(clashes[0].reason).toBe('temperature');
    expect(formatClock(clashes[0].atMin)).toBe('16:00');
  });

  it('leaves two trays at the same temperature alone', () => {
    // A busy oven is not a broken schedule.
    expect(
      findClashes([
        task({ id: 'a', label: 'Focaccia', startMin: at('16:30'), durationMin: 25, resource: 'oven', ovenTempF: 400 }),
        task({ id: 'b', label: 'Apps', startMin: at('16:35'), durationMin: 20, resource: 'oven', ovenTempF: 400 }),
      ]),
    ).toEqual([]);
  });

  it('ignores passive tasks — proving dough needs no oven', () => {
    expect(
      findClashes([
        task({ id: 'prove', label: 'Focaccia out of fridge', startMin: at('14:30'), durationMin: 120, passive: true, resource: 'oven', ovenTempF: 400 }),
        task({ id: 'turkey', label: 'Turkey', startMin: at('15:00'), durationMin: 60, resource: 'oven', ovenTempF: 325 }),
      ]),
    ).toEqual([]);
  });

  it('does not collide tasks on different days', () => {
    expect(
      findClashes([
        task({ id: 'fri', label: 'Bake sourdough', dayOffset: -1, startMin: at('15:00'), durationMin: 60, resource: 'oven', ovenTempF: 450 }),
        task({ id: 'sat', label: 'Turkey', dayOffset: 0, startMin: at('15:00'), durationMin: 60, resource: 'oven', ovenTempF: 325 }),
      ]),
    ).toEqual([]);
  });

  it('flags one tool wanted twice, regardless of temperature', () => {
    const [clash] = findClashes([
      task({ id: 'a', label: 'Mash', startMin: at('17:00'), durationMin: 30, resource: 'burner' }),
      task({ id: 'b', label: 'Gravy', startMin: at('17:15'), durationMin: 20, resource: 'burner' }),
    ]);
    expect(clash.reason).toBe('capacity');
    expect(clash.overlapMin).toBe(15);
  });

  it('suggests a time that clears it, without moving anything', () => {
    const tasks = [
      task({ id: 'turkey', label: 'Turkey 2', startMin: at('12:00'), durationMin: 240, resource: 'oven', ovenTempF: 325 }),
      task({ id: 'apps', label: 'Apps', startMin: at('15:30'), durationMin: 20, resource: 'oven', ovenTempF: 400 }),
    ];
    const [clash] = findClashes(tasks);
    // Turkey is out at 16:00, so the apps fit from then.
    expect(formatClock(clash.suggestMin as number)).toBe('16:00');
    // And the original is untouched — suggesting is not applying.
    expect(tasks[1].startMin).toBe(at('15:30'));
  });

  it('reports the earliest collision first, and only real overlaps', () => {
    const clashes = findClashes([
      task({ id: 'a', label: 'Turkey', startMin: at('08:00'), durationMin: 600, resource: 'oven', ovenTempF: 325 }),
      task({ id: 'b', label: 'Stuffing', startMin: at('17:00'), durationMin: 45, resource: 'oven', ovenTempF: 350 }),
      task({ id: 'c', label: 'Apps', startMin: at('16:00'), durationMin: 20, resource: 'oven', ovenTempF: 400 }),
    ]);
    // The turkey is in all afternoon, so it collides with both. Stuffing and
    // apps never overlap each other, so that is not a third clash.
    expect(clashes.map((c) => formatClock(c.atMin))).toEqual(['16:00', '17:00']);
    expect(clashes.map((c) => [c.a.label, c.b.label])).toEqual([
      ['Turkey', 'Apps'],
      ['Turkey', 'Stuffing'],
    ]);
  });
});

describe('oven lanes', () => {
  it('groups by temperature, coolest first, in time order', () => {
    const lanes = ovenLanes([
      task({ id: 'apps', label: 'Apps', startMin: at('16:00'), durationMin: 20, resource: 'oven', ovenTempF: 400 }),
      task({ id: 't1', label: 'Turkey 1', startMin: at('08:00'), durationMin: 300, resource: 'oven', ovenTempF: 325 }),
      task({ id: 't2', label: 'Turkey 2', startMin: at('12:00'), durationMin: 300, resource: 'oven', ovenTempF: 325 }),
      task({ id: 'mash', label: 'Mash', startMin: at('17:00'), durationMin: 20, resource: 'burner' }),
    ]);
    expect(lanes.map((l) => l.tempF)).toEqual([325, 400]);
    expect(lanes[0].tasks.map((t) => t.label)).toEqual(['Turkey 1', 'Turkey 2']);
  });
});

describe('splitting the run of show into days', () => {
  it('puts the day before ahead of the day itself', () => {
    const days = groupByDay([
      task({ id: 'a', label: 'Turkey in', dayOffset: 0, startMin: 13 * 60 }),
      task({ id: 'b', label: 'Brine the turkey', dayOffset: -1, startMin: 18 * 60 }),
    ]);

    expect(days.map((d) => d.dayOffset)).toEqual([-1, 0]);
    expect(days[0].timed.map((t) => t.label)).toEqual(['Brine the turkey']);
  });

  it('keeps a task with no time yet out of the timed order', () => {
    // "Sometime Thursday" is a real state a plan sits in for weeks; sorting it
    // to midnight would put it at the top of the day, above the 6am start.
    const [day] = groupByDay([
      task({ id: 'a', label: 'Order the turkey', dayOffset: -1 }),
      task({ id: 'b', label: 'Collect the turkey', dayOffset: -1, startMin: 10 * 60 }),
    ]);

    expect(day.timed.map((t) => t.label)).toEqual(['Collect the turkey']);
    expect(day.untimed.map((t) => t.label)).toEqual(['Order the turkey']);
  });

  it('orders a day by the clock', () => {
    const [day] = groupByDay([
      task({ id: 'c', label: 'Sides in', startMin: 16 * 60 }),
      task({ id: 'a', label: 'Turkey in', startMin: 13 * 60 }),
      task({ id: 'b', label: 'Stuffing in', startMin: 15 * 60 }),
    ]);

    expect(day.timed.map((t) => t.label)).toEqual(['Turkey in', 'Stuffing in', 'Sides in']);
  });
});

describe('the oven timeline window', () => {
  it('rounds out to whole hours around the work', () => {
    const w = timelineWindow(
      [task({ id: 'a', label: 'Turkey', startMin: 13 * 60 + 20, durationMin: 200 })],
      17 * 60 + 30,
    );

    expect(w.startMin).toBe(13 * 60);
    expect(w.endMin).toBe(17 * 60 + 60); // past the 16:40 finish, out to serving
  });

  it('always reaches the serve time', () => {
    // The picture is about work converging on dinner; stopping before it is
    // the wrong picture.
    const w = timelineWindow(
      [task({ id: 'a', label: 'Reheat', startMin: 12 * 60, durationMin: 20 })],
      18 * 60,
    );

    expect(w.endMin).toBeGreaterThanOrEqual(18 * 60);
  });

  it('gives an empty oven a sensible window rather than a zero-width one', () => {
    const w = timelineWindow([], 18 * 60);
    expect(w.endMin - w.startMin).toBeGreaterThanOrEqual(120);
  });
});

describe('drawing one bar', () => {
  const w = { startMin: 12 * 60, endMin: 18 * 60 }; // six hours

  it('places a task proportionally', () => {
    const geo = barGeometry(
      task({ id: 'a', label: 'Turkey', startMin: 15 * 60, durationMin: 90 }),
      w,
    );

    expect(geo?.leftPct).toBeCloseTo(50);
    expect(geo?.widthPct).toBeCloseTo(25);
  });

  it('keeps a zero-length reminder visible', () => {
    const geo = barGeometry(
      task({ id: 'a', label: 'Take the dough out', startMin: 15 * 60, durationMin: 0 }),
      w,
    );

    expect(geo?.widthPct).toBeGreaterThan(0);
  });

  it('never runs a bar off the end of the chart', () => {
    const geo = barGeometry(
      task({ id: 'a', label: 'Overrun', startMin: 17 * 60, durationMin: 600 }),
      w,
    );

    expect((geo?.leftPct ?? 0) + (geo?.widthPct ?? 0)).toBeLessThanOrEqual(100);
  });

  it('draws nothing for a task with no time', () => {
    expect(barGeometry(task({ id: 'a', label: 'Someday' }), w)).toBeNull();
  });
});

describe('packing the oven lanes', () => {
  it('keeps tasks that never overlap on one row', () => {
    const rows = packRows([
      task({ id: 'a', label: 'Turkey', startMin: 13 * 60, durationMin: 60 }),
      task({ id: 'b', label: 'Stuffing', startMin: 14 * 60, durationMin: 30 }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].map((t) => t.label)).toEqual(['Turkey', 'Stuffing']);
  });

  it('gives concurrent trays their own row', () => {
    // Three things at 375° at once is a working Saturday, not a clash — but
    // drawn on one line they become mush.
    const rows = packRows([
      task({ id: 'a', label: 'Stuffing', startMin: 16 * 60 + 30, durationMin: 45 }),
      task({ id: 'b', label: 'Squash', startMin: 16 * 60 + 40, durationMin: 35 }),
      task({ id: 'c', label: 'Dates', startMin: 16 * 60 + 45, durationMin: 15 }),
    ]);

    expect(rows).toHaveLength(3);
  });

  it('reuses a row once its last task has finished', () => {
    const rows = packRows([
      task({ id: 'a', label: 'First', startMin: 13 * 60, durationMin: 60 }),
      task({ id: 'b', label: 'Overlaps first', startMin: 13 * 60 + 30, durationMin: 30 }),
      task({ id: 'c', label: 'After both', startMin: 14 * 60, durationMin: 30 }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].map((t) => t.label)).toEqual(['First', 'After both']);
  });

  it('leaves out anything with no time', () => {
    expect(packRows([task({ id: 'a', label: 'Someday' })])).toEqual([]);
  });
});
