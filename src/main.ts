import { vim } from '@replit/codemirror-vim';
import { basicSetup, EditorView } from 'codemirror';

const parent = document.querySelector('#app');
if (!parent) throw new Error('#app not found');

new EditorView({
  doc: 'const a = 1;\nconst b = 2;',
  // vim() must come before basicSetup so its keymap takes precedence.
  extensions: [vim(), basicSetup],
  parent,
});
