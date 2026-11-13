import { t } from '../i18n/i18n';
import { h } from './h';

const STORE = 'insert-coin-sound';
let context: AudioContext | undefined;

/** Sound is off unless the player turned it on (SPEC §8.5). */
const isOn = (): boolean => {
  try {
    return localStorage.getItem(STORE) === 'on';
  } catch {
    return false;
  }
};

/** Arcade beeps: a low buzz for a blocked key, two rising notes for a finished level. */
export function beep(kind: 'denied' | 'done'): void {
  if (!isOn() || typeof AudioContext === 'undefined') return;
  const audio = (context ??= new AudioContext());
  const notes = kind === 'denied' ? [110] : [660, 880];
  notes.forEach((frequency, i) => {
    const at = audio.currentTime + i * 0.1;
    const osc = new OscillatorNode(audio, { type: 'square', frequency });
    const gain = new GainNode(audio, { gain: 0.05 });
    osc.connect(gain).connect(audio.destination);
    osc.start(at);
    osc.stop(at + 0.09);
  });
}

/** The sound checkbox of the title screen. */
export function soundSetting(): HTMLElement {
  const box = h('input', { type: 'checkbox', checked: isOn() });
  box.addEventListener('change', () => {
    try {
      localStorage.setItem(STORE, box.checked ? 'on' : 'off');
    } catch {
      // shortcut: storage blocked keeps the sound off; keep the choice in memory if players ask.
    }
  });
  return h('p', {}, h('label', {}, box, ' ', t('sound.label')));
}
