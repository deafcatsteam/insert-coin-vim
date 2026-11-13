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
  /** Best Speedrun of each chapter, by chapter number. Optional like `review`. */
  speedrun?: Record<string, Run>;
  /** Fewest keys of each level in Free Golf, by level id. Optional like `review`. */
  golf?: Record<string, number>;
}

/** A Speedrun of one chapter (SPEC §5.4). Times in ms from the first key of the run. */
export interface Run {
  ms: number;
  /** Time at the end of each level. The last one is `ms`. */
  splits: number[];
}

const STORE = 'insert-coin-save';

const isCount = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) > 0;

const isTime = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isRun = (value: unknown): value is Run => {
  const run = value as Partial<Run> | null;
  return (
    isTime(run?.ms) &&
    Array.isArray(run.splits) &&
    run.splits.length > 0 &&
    run.splits.every(isTime)
  );
};

/** An optional part of the save is bad when present but not a record of `valid` values. */
const isBad = (part: unknown, valid: (value: unknown) => boolean): boolean =>
  part !== undefined &&
  (!part || typeof part !== 'object' || !Object.values(part).every(valid));

/**
 * Reads a save from text nobody checked: storage, or a file the player picked.
 * `dropBad` keeps the level results of a save whose review queue, Speedruns or golf records are bad.
 */
const parse = (json: string, dropBad = false): Save => {
  const data = JSON.parse(json) as Partial<Save> | null;
  const results =
    data?.version === 1 && data.levels && typeof data.levels === 'object'
      ? Object.values(
          data.levels as Record<string, Partial<LevelResult> | null>,
        )
      : undefined;
  const badReview = isBad(data?.review, isCard);
  const badSpeedrun = isBad(data?.speedrun, isRun);
  const badGolf = isBad(data?.golf, isCount);
  if (
    !results?.every(
      (r) => isCount(r?.keys) && isCount(r.stars) && r.stars <= 3,
    ) ||
    ((badReview || badSpeedrun || badGolf) && !dropBad)
  )
    throw new Error('not an Insert Coin save');
  if (badReview) delete (data as Save).review;
  if (badSpeedrun) delete (data as Save).speedrun;
  if (badGolf) delete (data as Save).golf;
  return data as Save;
};

/**
 * An empty save when nothing is stored, or when storage is blocked or damaged.
 * A bad review queue, bad Speedruns or bad golf records alone are dropped: the next write would erase the levels too.
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

/** Keeps the run if it beats the stored one. Returns the record before this run. */
export function recordRun(chapter: number, run: Run): Run | undefined {
  const save = loadSave();
  const runs = (save.speedrun ??= {});
  const old = runs[chapter];
  if (!old || run.ms < old.ms) runs[chapter] = run;
  store(save);
  return old;
}

/** Keeps the keys if they beat the golf record of the level. Returns the record before. */
export function recordGolf(id: string, keys: number): number | undefined {
  const save = loadSave();
  const records = (save.golf ??= {});
  const old = records[id];
  if (!old || keys < old) records[id] = keys;
  store(save);
  return old;
}

export const exportSave = (): string => JSON.stringify(loadSave(), null, 2);

/**
 * Merges a save file into the stored one: best result per level, per concept
 * the card that comes back first, the fastest run per chapter and the fewest
 * golf keys per level. Throws on a bad file.
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
  if (incoming.speedrun) {
    const runs = (save.speedrun ??= {});
    for (const [chapter, run] of Object.entries(incoming.speedrun)) {
      const old = runs[chapter];
      if (!old || run.ms < old.ms) runs[chapter] = run;
    }
  }
  if (incoming.golf) {
    const records = (save.golf ??= {});
    for (const [id, keys] of Object.entries(incoming.golf))
      records[id] = Math.min(keys, records[id] ?? keys);
  }
  store(save);
}
