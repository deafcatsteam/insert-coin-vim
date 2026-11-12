import { Ajv } from 'ajv';
import { describe, expect, test } from 'vitest';
import schema from '../../levels/level.schema.json';
import en from '../../locales/en.json';
import { press } from '../engine/replay';
import { createSession } from '../engine/session';
import { parseKeys } from '../scoring/keys';
import { levelFiles, levels } from './levels';

// This file is `npm run validate:levels` (SPEC §10).
const validate = new Ajv({ allErrors: true }).compile(schema);

test('finds levels, each id once', () => {
  expect(levels.length).toBeGreaterThan(0);
  expect(new Set(levels.map((l) => l.id)).size).toBe(levels.length);
});

describe.each(Object.entries(levelFiles))('%s', (path, level) => {
  test('follows the schema', () => {
    validate(level);
    expect(validate.errors ?? []).toEqual([]);
    expect(path.endsWith(`/${level.id}.json`), 'id is the file name').toBe(
      true,
    );
    expect(level.par).toBeGreaterThanOrEqual(level.optimal);
    for (const key of level.forbiddenKeys ?? [])
      expect(parseKeys(key), `forbidden key ${key}`).toHaveLength(1);
  });

  test('every text key exists in locales/en.json', () => {
    const brief = level.brief ? [level.brief] : [];
    for (const { key } of [level.title, ...brief, ...level.hints])
      expect(en, key).toHaveProperty([key]);
  });

  test.each(level.solutions)('%s completes the level', (solution) => {
    const session = createSession(document.body, level);
    press(session.view, solution);
    const result = {
      done: session.done,
      faults: session.faults,
      // Fewer keys than written: the level was complete before the last key.
      keys: session.keys.length,
    };
    const buffer = session.view.state.doc.toString();
    session.destroy();
    // The buffer is the failure message.
    expect(result, JSON.stringify(buffer)).toEqual({
      done: true,
      faults: 0,
      keys: parseKeys(solution).length,
    });
  });

  test('optimal is the length of the shortest solution', () => {
    const lengths = level.solutions.map((s) => parseKeys(s).length);
    expect(level.optimal).toBe(Math.min(...lengths));
  });
});
