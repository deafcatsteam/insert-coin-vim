import { describe, expect, test } from 'vitest';
import { parseKeys } from '../scoring/keys';
import { matches } from './match';
import { replay, type ReplayLevel } from './replay';

interface SampleLevel extends ReplayLevel {
  id: string;
  target: string;
  optimal: number;
  solutions: string[];
}

const levels = Object.values(
  import.meta.glob<SampleLevel>('../../levels/sample/*.json', {
    eager: true,
    import: 'default',
  }),
);

test('finds the sample levels', () => {
  expect(levels).toHaveLength(3);
});

describe.each(levels)('$id', (level) => {
  test.each(level.solutions)('%s reaches the target', (solution) => {
    const result = replay(level, solution);
    // The buffer is the failure message.
    expect(
      matches(result.buffer, level.target),
      JSON.stringify(result.buffer),
    ).toBe(true);
    // The recorder must count exactly what the notation says.
    expect(result.keys).toBe(parseKeys(solution).length);
  });

  test('optimal is the length of the shortest solution', () => {
    const lengths = level.solutions.map((s) => parseKeys(s).length);
    expect(level.optimal).toBe(Math.min(...lengths));
  });
});

test('a wrong solution does not reach the target', () => {
  const result = replay({ start: 'one\ntwo\n' }, 'x');
  expect(result.buffer).toBe('ne\ntwo\n');
  expect(matches(result.buffer, 'one\ntwo\n')).toBe(false);
});
