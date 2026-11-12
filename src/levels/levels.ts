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

/** Level files by path. `npm run validate:levels` checks each one. */
export const levelFiles = import.meta.glob<Level>('../../levels/*/*.json', {
  eager: true,
  import: 'default',
});

/** All levels, in playing order. */
export const levels: Level[] = Object.values(levelFiles).sort(
  (a, b) => a.chapter - b.chapter || a.id.localeCompare(b.id),
);
