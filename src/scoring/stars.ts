/** SPEC §5.2: ★ completed, ★★ at most `par` keys, ★★★ at most `optimal` keys. */
export const stars = (
  keys: number,
  level: { par: number; optimal: number },
): 1 | 2 | 3 => (keys <= level.optimal ? 3 : keys <= level.par ? 2 : 1);
