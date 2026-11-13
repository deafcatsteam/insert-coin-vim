import type { Save } from '../progress/save';

/** Review state of one concept: a Leitner box, and the day it comes back. */
export interface Card {
  box: number;
  /** Daily challenge number (src/daily/daily.ts): one number per UTC day. */
  due: number;
}

/** Days until the next review, by box. A success in the last box ends the review. */
const INTERVALS = [1, 3, 7] as const;

/** Checks a card read from storage or from a file the player picked. */
export const isCard = (value: unknown): value is Card => {
  const card = value as Partial<Card> | null;
  return (
    Number.isInteger(card?.box) &&
    (card?.box as number) >= 0 &&
    (card?.box as number) < INTERVALS.length &&
    Number.isInteger(card?.due) &&
    (card?.due as number) > 0
  );
};

/**
 * Cards after a level that teaches `concepts`, played on `day`.
 * `weak`: skipped, or one star (SPEC §5.3). Its concepts come back the next day.
 * A success moves a due concept to the next box. One that is not due yet stays
 * where it is, so playing a level again the same day does not empty the queue.
 */
export function nextCards(
  cards: Readonly<Record<string, Card>>,
  concepts: readonly string[],
  weak: boolean,
  day: number,
): Record<string, Card> {
  const next = { ...cards };
  for (const concept of concepts) {
    const card = next[concept];
    if (weak) next[concept] = { box: 0, due: day + INTERVALS[0] };
    else if (card && card.due <= day) {
      const box = card.box + 1;
      const interval = INTERVALS[box];
      if (interval === undefined) Reflect.deleteProperty(next, concept);
      else next[concept] = { box, due: day + interval };
    }
  }
  return next;
}

/** Of two cards of the same concept, the one that comes back first. */
export const sooner = (a: Card, b: Card | undefined): Card =>
  !b || a.due < b.due || (a.due === b.due && a.box < b.box) ? a : b;

/**
 * Indexes in `levels` of the levels to review on `day`, most overdue concept
 * first. Each due concept gets the level that teaches it with the fewest stars.
 */
export function dueLevels(
  save: Save,
  levels: readonly { id: string; concepts: readonly string[] }[],
  day: number,
): number[] {
  const due = Object.entries(save.review ?? {})
    .filter(([, card]) => card.due <= day)
    .sort(([a, x], [b, y]) => x.due - y.due || a.localeCompare(b));
  const picked = new Set<number>();
  for (const [concept] of due) {
    let best = -1;
    levels.forEach((level, i) => {
      if (!level.concepts.includes(concept)) return;
      const stars = (id: string): number => save.levels[id]?.stars ?? 0;
      const current = levels[best];
      if (!current || stars(level.id) < stars(current.id)) best = i;
    });
    // A concept no level teaches any more (a removed level) is left alone.
    if (best >= 0) picked.add(best);
  }
  return [...picked];
}
