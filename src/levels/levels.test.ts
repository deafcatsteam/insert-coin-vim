import { Ajv } from 'ajv';
import { describe, expect, test } from 'vitest';
import schema from '../../levels/level.schema.json';
import en from '../../locales/en.json';
import { press } from '../engine/replay';
import { createSession } from '../engine/session';
import { parseKeys } from '../scoring/keys';
import {
  levelFiles,
  levels,
  packs,
  packsOf,
  type Level,
  type Pack,
} from './levels';

// This file is `npm run validate:levels` (SPEC §10).
const validate = new Ajv({ allErrors: true }).compile(schema);

test('finds levels, each id once', () => {
  expect(levels.length).toBeGreaterThan(0);
  const ids = Object.values(levelFiles).map((l) => l.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test('every concept of the schema is taught by a level', () => {
  const taught = new Set(levels.flatMap((l) => l.concepts));
  expect(
    schema.properties.concepts.items.enum.filter((c) => !taught.has(c)),
  ).toEqual([]);
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

  // On AZERTY, "`" then "a" types one letter, "à", and the recorder cannot split it
  // (src/engine/recorder.ts). The same goes for ^, ~ and ¨ before the letters they accent.
  test.each(level.solutions)(
    '%s has no dead key before a letter it accents',
    (solution) => {
      expect(solution).not.toMatch(/[\^`~¨][aeiouyAEIOUYnN]/u);
    },
  );

  test('optimal is the length of the shortest solution', () => {
    const lengths = level.solutions.map((s) => parseKeys(s).length);
    expect(level.optimal).toBe(Math.min(...lengths));
  });
});

/** Longest title, brief or hint, and largest buffer, of a community level. */
const LIMITS = { title: 40, text: 400, lines: 30, width: 80 };
/** A link in a text: packs carry no links (CONTRIBUTING.md, content rules). */
const LINK = /https?:|www\./i;

/** What breaks the community pack rules of CONTRIBUTING.md, as messages. */
const packProblems = (pack: Pack, texts: Record<string, string>): string[] => {
  const problems: string[] = [];
  const text = (key: string, max: number): void => {
    const value = texts[key];
    if (value === undefined) problems.push(`${key} is missing`);
    else if (value.length > max)
      problems.push(`${key} is over ${max} characters`);
    else if (LINK.test(value)) problems.push(`${key} has a link`);
  };
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(pack.id))
    problems.push(`pack name ${pack.id} is not lowercase-with-dashes`);
  if (pack.levels.length < 3 || pack.levels.length > 10)
    problems.push(`${pack.id} has ${pack.levels.length} levels, not 3 to 10`);
  text(`community.${pack.id}.title`, LIMITS.title);
  for (const level of pack.levels) {
    if (!level.id.startsWith(`${pack.id}-`))
      problems.push(`${level.id} does not start with ${pack.id}-`);
    text(level.title.key, LIMITS.title);
    for (const { key } of [
      ...(level.brief ? [level.brief] : []),
      ...level.hints,
    ])
      text(key, LIMITS.text);
    for (const buffer of [level.start, level.target]) {
      const lines = buffer.split('\n');
      if (
        lines.length > LIMITS.lines ||
        lines.some((line) => line.length > LIMITS.width)
      )
        problems.push(
          `${level.id} has a buffer over ${LIMITS.lines} lines or ${LIMITS.width} columns`,
        );
      if (LINK.test(buffer))
        problems.push(`${level.id} has a link in a buffer`);
    }
  }
  return problems;
};

describe.each(packs)('community pack $id', (pack) => {
  test('follows the pack rules', () => {
    expect(packProblems(pack, en)).toEqual([]);
  });
});

describe('the pack rules', () => {
  const level = (id: string, start = 'a'): Level => ({
    ...(levels[0] as Level),
    id,
    title: { key: `levels.${id}.title` },
    brief: undefined,
    hints: [{ key: `levels.${id}.hint1` }],
    start,
    target: start,
  });
  const texts = {
    'community.demo.title': 'Demo',
    'levels.demo-01.title': 'One',
    'levels.demo-01.hint1': 'Press x.',
    'levels.demo-02.title': 'Two',
    'levels.demo-02.hint1': 'Press x.',
    'levels.demo-03.title': 'Three',
    'levels.demo-03.hint1': 'Press x.',
  };
  const good: Pack = {
    id: 'demo',
    levels: [level('demo-01'), level('demo-02'), level('demo-03')],
  };

  test('accept a good pack', () => {
    expect(packProblems(good, texts)).toEqual([]);
  });

  test('catch each broken rule', () => {
    const bad: Pack = {
      id: 'demo',
      levels: [level('demo-01', 'see www.example.com'), level('other-02')],
    };
    expect(
      packProblems(bad, {
        ...texts,
        'community.demo.title': 'x'.repeat(41),
        'levels.demo-01.hint1': 'Go to https://example.com',
      }),
    ).toEqual([
      'demo has 2 levels, not 3 to 10',
      'community.demo.title is over 40 characters',
      'levels.demo-01.hint1 has a link',
      'demo-01 has a link in a buffer',
      'demo-01 has a link in a buffer',
      'other-02 does not start with demo-',
      'levels.other-02.title is missing',
      'levels.other-02.hint1 is missing',
    ]);
  });

  test('catch a buffer too wide', () => {
    const wide = level('demo-01', 'x'.repeat(81));
    expect(
      packProblems({ ...good, levels: [wide, ...good.levels.slice(1)] }, texts),
    ).toContain('demo-01 has a buffer over 30 lines or 80 columns');
  });
});

test('packsOf groups the files by folder, in id order', () => {
  const at = (id: string): Level => ({ ...(levels[0] as Level), id });
  const got = packsOf({
    '../../levels/community/zed/zed-01.json': at('zed-01'),
    '../../levels/community/abc/abc-02.json': at('abc-02'),
    '../../levels/community/abc/abc-01.json': at('abc-01'),
  });
  expect(got.map((p) => [p.id, p.levels.map((l) => l.id)])).toEqual([
    ['abc', ['abc-01', 'abc-02']],
    ['zed', ['zed-01']],
  ]);
});
