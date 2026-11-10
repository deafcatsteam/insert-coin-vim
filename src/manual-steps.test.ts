import { expect, test } from 'vitest';
import { replay } from './engine/replay';
import { steps } from './manual-steps';

// A wrong expectation would make the tester chase a failure that is not real.
test.each(steps.filter((step) => !step.browserOnly))(
  'manual step "$title" has a reachable expected buffer',
  ({ start, cursor, keys, want }) => {
    const [line, ch] = cursor ?? [0, 0];
    expect(replay({ start, cursor: { line, ch } }, keys).buffer).toBe(want);
  },
);
