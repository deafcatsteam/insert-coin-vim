import type { SessionLevel } from '../engine/session';
import { parseKeys } from '../scoring/keys';

/** A key of `locales/en.json`. */
export interface TextRef {
  key: string;
}

/** One level file (SPEC §7). `levels/level.schema.json` is the reference. */
export interface Level extends SessionLevel {
  id: string;
  chapter: number;
  title: TextRef;
  /** What to do, shown from the start. */
  brief?: TextRef;
  concepts: string[];
  language?: string;
  par: number;
  optimal: number;
  solutions: string[];
  hints: TextRef[];
  match?: 'exact';
  author: string;
  license: string;
}

/** The solution with the fewest keys. */
export const shortest = (level: Level): string =>
  level.solutions.reduce((a, b) =>
    parseKeys(b).length < parseKeys(a).length ? b : a,
  );

const campaignFiles = import.meta.glob<Level>('../../levels/c*/*.json', {
  eager: true,
  import: 'default',
});
const golfFiles = import.meta.glob<Level>('../../levels/golf/*.json', {
  eager: true,
  import: 'default',
});

/** Level files by path, the golf pack included. `npm run validate:levels` checks each one. */
export const levelFiles = { ...campaignFiles, ...golfFiles };

/** All levels of the campaign, in playing order. */
export const levels: Level[] = Object.values(campaignFiles).sort(
  (a, b) => a.chapter - b.chapter || a.id.localeCompare(b.id),
);

/** The expert puzzles of Free Golf (SPEC §5.4), only played there. */
export const golfPack: Level[] = Object.values(golfFiles).sort((a, b) =>
  a.id.localeCompare(b.id),
);
