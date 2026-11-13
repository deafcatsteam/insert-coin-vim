import { golfPack, levels, shortest, type Level } from '../levels/levels';
import { parseKeys } from '../scoring/keys';
import type { LevelResult, Save } from './save';

/** The unlockable screen themes (SPEC §5.6), in the order of the settings list. */
export const THEMES = ['olive', 'phosphor', 'ice', 'paper'] as const;
export type Theme = (typeof THEMES)[number];

/** The title screen badges (SPEC §5.6), in display order. */
export const BADGES = [
  'campaign',
  'stars',
  'speedrun',
  'golf',
  'noHints',
  'noArrows',
] as const;
export type Badge = (typeof BADGES)[number];

/** The campaign levels, one array per chapter, in order. */
const chapters = (): Level[][] => {
  const byChapter = new Map<number, Level[]>();
  for (const level of levels) {
    const list = byChapter.get(level.chapter) ?? [];
    list.push(level);
    byChapter.set(level.chapter, list);
  }
  return [...byChapter.values()];
};

/** True when each of `list` has a result and every result passes `ok`. */
const all = (
  save: Save,
  list: readonly Level[],
  ok: (result: LevelResult) => boolean = () => true,
): boolean =>
  list.every((level) => {
    const result = save.levels[level.id];
    return result !== undefined && ok(result);
  });

/** The themes this save unlocks. */
export function themes(save: Save): Theme[] {
  const won: Record<Theme, boolean> = {
    olive: all(save, levels),
    phosphor: chapters().some((c) => all(save, c, (r) => r.stars === 3)),
    ice: Object.keys(save.speedrun ?? {}).length > 0,
    paper: all(save, chapters().at(-1) ?? []),
  };
  return THEMES.filter((theme) => won[theme]);
}

/** The badges this save earns. */
export function badges(save: Save): Badge[] {
  const parts = chapters();
  const won: Record<Badge, boolean> = {
    campaign: all(save, levels),
    stars: all(save, levels, (r) => r.stars === 3),
    speedrun: parts.every((c) => save.speedrun?.[c[0]?.chapter ?? -1]),
    // Matching the reference counts: it may be the true minimum, so beating it may be impossible.
    golf: golfPack.some(
      (level) =>
        (save.golf?.[level.id] ?? Infinity) <=
        parseKeys(shortest(level)).length,
    ),
    noHints: parts.some((c) => all(save, c, (r) => r.noHints === true)),
    noArrows: parts.some((c) => all(save, c, (r) => r.noArrows === true)),
  };
  return BADGES.filter((badge) => won[badge]);
}
