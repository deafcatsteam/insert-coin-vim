/** Daily challenge #1 starts at this UTC midnight. */
const FIRST_DAY_MS = Date.UTC(2026, 10, 13);
const DAY_MS = 86_400_000;

/** Number of the daily challenge at `now`, from 1. The day changes at midnight UTC. */
export const dailyNumber = (now: Date): number =>
  // A clock set before day 1 gets day 1.
  Math.max(1, Math.floor((now.getTime() - FIRST_DAY_MS) / DAY_MS) + 1);

/** FNV-1a, then the MurmurHash3 finalizer so close inputs give far-apart numbers. */
const hash = (text: string): number => {
  let x = 0x811c9dc5;
  for (let i = 0; i < text.length; i++)
    x = Math.imul(x ^ text.charCodeAt(i), 0x01000193);
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
};

/**
 * Index in `levels` of the level of daily challenge `day`: the same for every player.
 * Each level gets a score from the day and its id, and the best score wins. A new
 * level only takes the days it wins, so most past and future days keep their level.
 */
export const dailyIndex = (
  day: number,
  levels: readonly { id: string }[],
): number => {
  let best = 0;
  let bestScore = -1;
  levels.forEach((level, i) => {
    const score = hash(`${day}:${level.id}`);
    if (score > bestScore) [best, bestScore] = [i, score];
  });
  return best;
};
