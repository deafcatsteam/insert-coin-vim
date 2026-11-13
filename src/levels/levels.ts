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

const communityFiles = import.meta.glob<Level>(
  '../../levels/community/*/*.json',
  { eager: true, import: 'default' },
);

/** Level files by path, the packs included. `npm run validate:levels` checks each one. */
export const levelFiles = { ...campaignFiles, ...golfFiles, ...communityFiles };

/** All levels of the campaign, in playing order. */
export const levels: Level[] = Object.values(campaignFiles).sort(
  (a, b) => a.chapter - b.chapter || a.id.localeCompare(b.id),
);

/** The expert puzzles of Free Golf (SPEC §5.4), only played there. */
export const golfPack: Level[] = Object.values(golfFiles).sort((a, b) =>
  a.id.localeCompare(b.id),
);

/** A community level pack (CONTRIBUTING.md): one folder of `levels/community/`. */
export interface Pack {
  /** The folder name. Every level id starts with it. */
  id: string;
  levels: Level[];
}

/** Groups level files by their folder under `community/`, each pack and its levels sorted by id. */
export const packsOf = (files: Record<string, Level>): Pack[] => {
  const byPack = new Map<string, Level[]>();
  for (const [path, level] of Object.entries(files)) {
    const id = path.split('/').at(-2) ?? '';
    byPack.set(id, [...(byPack.get(id) ?? []), level]);
  }
  return [...byPack]
    .map(([id, list]) => ({
      id,
      levels: list.sort((a, b) => a.id.localeCompare(b.id)),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
};

/** The community packs, played only from their own screen: no badge, no review. */
export const packs: Pack[] = packsOf(communityFiles);
