import { isCard, nextCards, sooner, type Card } from '../review/review';

/** The best result of one completed level. */
export interface LevelResult {
  stars: number;
  keys: number;
}

/** Everything the game stores. Also the content of an exported save file. */
export interface Save {
  // shortcut: one version, so no migration yet; add a migration step in `parse`
  // when this shape changes.
  version: 1;
  /** By level id. */
  levels: Record<string, LevelResult>;
  /**
   * Concepts to review, by concept id (src/review/review.ts). Optional, so saves
   * from before review mode stay version 1.
   */
  review?: Record<string, Card>;
}

const STORE = 'insert-coin-save';

const isCount = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) > 0;

/**
 * Reads a save from text nobody checked: storage, or a file the player picked.
 * `dropBadReview` keeps the level results of a save whose review queue is bad.
 */
const parse = (json: string, dropBadReview = false): Save => {
  const data = JSON.parse(json) as Partial<Save> | null;
  const results =
    data?.version === 1 && data.levels && typeof data.levels === 'object'
      ? Object.values(
          data.levels as Record<string, Partial<LevelResult> | null>,
        )
      : undefined;
  const review = data?.review;
  const badReview =
    review !== undefined &&
    (!review ||
      typeof review !== 'object' ||
      !Object.values(review).every(isCard));
  if (
    !results?.every(
      (r) => isCount(r?.keys) && isCount(r.stars) && r.stars <= 3,
    ) ||
    (badReview && !dropBadReview)
  )
    throw new Error('not an Insert Coin save');
  if (badReview) delete (data as Save).review;
  return data as Save;
};

/**
 * An empty save when nothing is stored, or when storage is blocked or damaged.
 * A bad review queue alone is dropped: the next write would erase the levels too.
 */
export function loadSave(): Save {
  try {
    return parse(localStorage.getItem(STORE) ?? '', true);
  } catch {
    return { version: 1, levels: {} };
  }
}

const store = (save: Save): void => {
  try {
    localStorage.setItem(STORE, JSON.stringify(save));
  } catch {
    // Storage blocked or full: the game goes on without a save.
  }
};

const better = (a: LevelResult, b: LevelResult | undefined): LevelResult =>
  !b || a.stars > b.stars || (a.stars === b.stars && a.keys < b.keys) ? a : b;

/** Keeps the result if it beats the stored one. Returns the best of the two. */
export function recordResult(id: string, result: LevelResult): LevelResult {
  const save = loadSave();
  const best = better(result, save.levels[id]);
  save.levels[id] = best;
  store(save);
  return best;
}

/** Updates the review queue after a level, or after a skip (`weak`). */
export function recordReview(
  concepts: readonly string[],
  weak: boolean,
  day: number,
): void {
  const save = loadSave();
  save.review = nextCards(save.review ?? {}, concepts, weak, day);
  store(save);
}

export const exportSave = (): string => JSON.stringify(loadSave(), null, 2);

/**
 * Merges a save file into the stored one: best result per level, and per concept
 * the card that comes back first. Throws on a bad file.
 */
export function importSave(json: string): void {
  const incoming = parse(json);
  const save = loadSave();
  for (const [id, result] of Object.entries(incoming.levels))
    save.levels[id] = better(result, save.levels[id]);
  if (incoming.review) {
    const review = (save.review ??= {});
    for (const [concept, card] of Object.entries(incoming.review))
      review[concept] = sooner(card, review[concept]);
  }
  store(save);
}
