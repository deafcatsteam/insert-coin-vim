import { levels } from './levels/levels';
import { recordResult } from './progress/save';
import { stars } from './scoring/stars';
import { showGame } from './ui/game';
import { showResults } from './ui/results';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('page markup missing: app');

let index = 0;
let close = (): void => undefined;

/** Starts the current level again from its start buffer. */
const play = (): void => {
  close();
  const level = levels[index];
  if (!level) return;
  close = showGame(
    root,
    level,
    (attempt) => {
      close();
      const keys = attempt.keys.length;
      recordResult(level.id, { stars: stars(keys, level), keys });
      close = showResults(root, level, attempt, {
        retry: play,
        next: levels[index + 1]
          ? () => {
              index++;
              play();
            }
          : undefined,
      });
    },
    play,
  );
};

// The reset shortcut (SPEC §5.3). F2 means nothing to Vim or to the browsers.
window.addEventListener(
  'keydown',
  (e) => {
    if (e.key !== 'F2') return;
    e.preventDefault();
    e.stopPropagation();
    play();
  },
  true,
);

play();
