# Insert Coin — a Vim arcade trainer

> Product & technical specification — v0.1 (draft)
> Status: pre-prototype. Section 12 (Phase 0) MUST be completed and validated before level design starts.

---

## 1. Vision

A free, open-source, browser-based game that teaches Vim from absolute beginner to expert through short editing puzzles, wrapped in a "cassette futurism" retro-terminal aesthetic.

**Core promise:** short challenge → instant feedback → score → retry. Muscle memory over theory.

**Non-goals (v1):** not a full Vim replacement, no backend, no accounts, no mobile gameplay, no global leaderboard.

---

## 2. Target audience

| Segment | Need |
|---|---|
| Absolute beginners | Survive Vim: modes, move, edit, save/quit |
| Casual users | Stop using arrows/hjkl only; learn the operator + motion grammar |
| Intermediate | Text objects, registers, search, visual block |
| Experts | Macros, `:s` regex, `:g`, `:norm`, keystroke golf |

---

## 3. Lessons from existing tools

| Tool | Keep | Avoid |
|---|---|---|
| vimtutor | Real Vim, free | No motivation, stops at basics |
| Vim Adventures | Gamified progression | Far from real editing, paid |
| VimGolf | Keystroke optimization, addictive | Brutal for beginners |
| vim-be-good | Fast timed repetition | No learning path |
| PacVim | Fun | Little transfer to real editing |

---

## 4. Pedagogical principles

1. **One concept at a time**, then combine (operator + motion grammar is the key idea).
2. **Forced constraints**: levels can forbid keys (e.g. no `hjkl`) to force the right habit.
3. **Efficiency feedback**: "You used 12 keys — optimal is 4: `ci"`".
4. **Spaced repetition**: concepts the player struggled with come back later.
5. **Real text**: code (JS, Python, JSON, Markdown, config files) and prose.
6. **Speed last**: timers and speedruns once concepts are mastered.

---

## 5. Gameplay

### 5.1 Core loop
1. Player sees a **start buffer** and a **target buffer** (diff highlighted).
2. Player edits with Vim keys.
3. Level completes as soon as the buffer equals the target (whitespace rules defined per level, default: exact match).
4. Results screen: stars, keystroke count, time, replay vs. optimal solution.

### 5.2 Scoring
- ★ completed · ★★ ≤ `par` keystrokes · ★★★ ≤ `optimal` keystrokes.
- Only the final result matters; any valid solution is accepted.
- **Keystroke counting follows VimGolf conventions**: `<Esc>`, `<CR>`, `<C-x>` each count as 1.
- Using a forbidden key → "⚠ ACCESS DENIED" popup, key is not applied, counted as a fault (no star loss in beginner chapters).

### 5.3 Anti-frustration
- Hint 1 after 2 failed attempts / 60 s idle, hint 2 after 4.
- "Show solution" → level can be completed with max ★.
- Skip level allowed; the concept is pushed to the review queue.
- Reset buffer: dedicated UI button + shortcut outside Vim keys.

### 5.4 Game modes
| Mode | Description | Version |
|---|---|---|
| Campaign | Guided chapters, skill tree | MVP |
| Daily Challenge | Deterministic level from the date (same for everyone, no server) | v1.0 |
| Review | Spaced repetition on weak concepts | v1.0 |
| Speedrun | Chain of levels against the clock | v1.x |
| Free Golf | Expert puzzles, VimGolf style | v1.x |

**Speedrun rules.** One run per chapter, offered once every level of it is done. The clock starts at the first key of the first level and stops when the last level is solved; time between levels counts. No hints, no solution, no skip. Reset (F2) starts the whole run again; leaving the run drops it. A run gives no stars and no review. The best time per chapter is saved with its splits.

**Free Golf rules.** Step 1: any level already done can be replayed from the title screen for keys alone. No hints, no solution, no skip, no stars, no review, no share. The record to beat is shown before the first key: the player's golf record, else the reference solution. The fewest keys per level are saved apart from the campaign result; a campaign attempt does not count. The results show the reference solution with its replay. Step 2 (later): a pack of expert puzzles.

### 5.5 Sharing
Wordle-style copyable text, e.g.:
```
INSERT COIN #042 ★★★
7 keys (par 9) · 00:14
insertcoin.example/daily
```

### 5.6 Unlockables
Cosmetic rewards for feats. Local only, stored with the save.

| Reward | Unlocked by |
|---|---|
| Theme "LCD olive" | Clearing the campaign |
| Theme "Phosphor" | All ★★★ in one chapter |
| Theme "Ice" | First Speedrun record |
| Theme "Paper" | Clearing chapter 11 (Golf) |
| Badges on the title screen | Feats such as "no hints", "no arrow keys", "★★★ everywhere" (exact list in the plan) |
| Arcade initials (3 letters) | Shown next to a Speedrun record |
| Attract mode | Always on: an idle title screen replays a level solution, like an arcade cabinet |

Display settings show a theme list with only the unlocked themes.

---

## 6. Curriculum (skill tree)

| Chapter | Tier | Concepts |
|---|---|---|
| 0 — Boot | Beginner | Modes, `i` `<Esc>`, `hjkl`, `:w` `:q` `:wq` `:q!` |
| 1 — Basic edits | Beginner | `x`, `dd`, `u`, `<C-r>`*, `a A I o O` |
| 2 — Word motions | Beginner | `w b e W B E`, `0 ^ $`, counts |
| 3 — Grammar | Intermediate | `d c y` + motions, `p P`, `.` |
| 4 — Line jumps | Intermediate | `f t F T ; ,`, `gg G`, `{n}G`, `%` |
| 5 — Text objects | Advanced | `iw aw i" a" i( a( ip ap` |
| 6 — Search | Advanced | `/ ? n N * #`, `cgn` |
| 7 — Visual | Advanced | `v V <C-v>`*, block insert |
| 8 — Registers | Advanced | `"0`, `''`, `<C-r>` with a register in insert mode |
| 9 — Macros | Expert | `q`, `@`, `@@`, counts on macros |
| 10 — Ex power | Expert | `:s` with regex, ranges, `:g`, `:norm` |
| 11 — Golf | Expert | Combined optimization puzzles |

\* Subject to Phase 0 browser-shortcut findings (section 12).
Final chapter contents depend on what the Vim emulation supports reliably.
Removed after Phase 0 (`docs/phase0-report.md`): `it`, `at` (chapter 5) and `"+` (chapter 8). Chapter 10 regex levels use only patterns that mean the same in Vim and in JavaScript.
Not in chapter 8: `"a`–`"z`, `"A` and `m` marks. In a level-sized text they are never the shortest
way (reordering the steps, `p` over a selection or `''` win), and a level's reference solution
must be the shortest known one. `` ` `` is also a dead key on AZERTY.

**MVP: 20 levels** covering chapters 0–3.

---

## 7. Level format

One JSON file per level: `levels/<chapter>/<id>.json`, validated by JSON Schema in CI.

```json
{
  "id": "c03-l04",
  "chapter": 3,
  "title": { "key": "levels.c03-l04.title" },
  "concepts": ["operator-d", "motion-w", "dot-repeat"],
  "start": "const a = 1;\nconst b = 2;\n",
  "target": "a = 1;\nb = 2;\n",
  "cursor": { "line": 0, "ch": 0 },
  "language": "javascript",
  "forbiddenKeys": ["x", "<Del>"],
  "par": 8,
  "optimal": 5,
  "solutions": ["dwj0."],
  "hints": [
    { "key": "levels.c03-l04.hint1" },
    { "key": "levels.c03-l04.hint2" }
  ],
  "match": "exact",
  "author": "github-username",
  "license": "CC-BY-4.0"
}
```

Rules:
- All player-facing strings are **i18n keys**, never raw text.
- Optional `brief` (an i18n key, like `title`): one or two sentences that say what to do, shown above the buffer from the start. Beginner levels need it; hints only come after failed attempts.
- `solutions` use Vim key notation and are replayed by tests (section 10).
- `optimal` MUST equal the keystroke count of the shortest listed solution (CI-checked).
- A solution ends on the key that completes the level: the level completes as soon as the buffer equals `target`, so a final `<Esc>` is not part of it (CI-checked).
- Optional `exit` (`"w"`, `"q"`, `"wq"` or `"q!"`), for chapter 0: the level completes when the player runs that Ex command while the buffer equals `target`.
- The reference is `levels/level.schema.json`; `npm run validate:levels` checks every level.

---

## 8. Narrative & art direction

### 8.1 Concept
The player is a newly recruited **operator** at a fictional megacorporation. They insert a coin into a training terminal and must pass certification modules. Light corporate-dystopian humor, never in the way of gameplay.

- Corporation name: **original and fictional** (to be defined). No names, logos or assets from *Alien* or other franchises.
- Short in-world messages only (boot screen, module titles, ACCESS DENIED, certification stamps).

### 8.2 Style: cassette futurism / lo-fi sci-fi
| Screen | Treatment |
|---|---|
| Title & menus | Physical device: light grey casing, lens, speaker grille, red LED, physical buttons, "INSERT COIN" blinking |
| Gameplay | Editor fills the CRT screen; device chrome minimized |
| Results & progression | Data-dense amber dashboard: numbered panels, skill tree drawn as a circuit diagram |
| Errors | Boxed "⚠ ACCESS DENIED" popup |

### 8.3 Design tokens
| Token | Value |
|---|---|
| `--bg` | `#0B0A08` |
| `--fg` (amber) | `#FF8A1F` |
| `--accent` (phosphor green, actions/success) | `#39FF6A` |
| `--danger` | `#FF3B30` |
| `--casing` | `#D9D9D6` |
| Unlockable themes | "LCD olive" (green-grey monochrome), "Phosphor" (green on black), "Ice" (cold cyan), "Paper" (black ink on cream). Each meets WCAG AA (contrast ≥ 4.5). |

### 8.4 Typography (OFL licensed)
- Display: VT323 or Share Tech Mono.
- Editor: IBM Plex Mono or JetBrains Mono (readability first).
- Fonts are self-hosted (no external CDN).

### 8.5 Effects & accessibility
- Scanlines, glow, screen curvature, flicker: subtle, each toggleable in **Display settings**.
- `prefers-reduced-motion` respected by default (no flicker, no boot animation).
- Text contrast meets WCAG AA in the editor.
- Every intro/animation is skippable.
- Sound: optional arcade beeps, **off by default**.

### 8.6 Devices
Desktop/laptop with physical keyboard only. Mobile/tablet: title screen + "Requires a keyboard" message.

---

## 9. Technical architecture

### 9.1 Stack
- **TypeScript**, **Vite**.
- **CodeMirror 6** + **`@replit/codemirror-vim`** (MIT).
- UI framework: none, vanilla TypeScript (decided after Phase 0, see `docs/phase0-report.md`).
- Tests: Vitest (unit), Playwright (E2E + keyboard).
- Lint/format: ESLint + Prettier.

### 9.2 Modules
| Module | Responsibility |
|---|---|
| `engine/` | Load level, wrap CodeMirror+Vim, record keystrokes, compare buffer, detect completion |
| `scoring/` | Keystroke counting (VimGolf conventions), stars |
| `levels/` | JSON files + schema + loader |
| `progress/` | localStorage save, export/import (JSON file), versioned save schema with migrations |
| `review/` | Spaced repetition queue per concept |
| `daily/` | Date-seeded deterministic level selection (UTC) |
| `i18n/` | Locale files `locales/<lang>.json`, English default |
| `ui/` | Screens, design system components, effects |

### 9.3 Keyboard handling
- Read `KeyboardEvent.key` (not `code`) to support AZERTY / QWERTZ / QWERTY.
- Handle dead keys (`^`, `` ` ``, `~` on AZERTY).
- Maintain a documented list of browser-reserved shortcuts and their in-game fallback.
- Offer a fullscreen mode (reduces intercepted shortcuts).

### 9.4 Data & privacy
- 100% static. No backend, no cookies, no analytics, no tracking. Stated in README.

---

## 10. Quality & CI

GitHub Actions on every PR:
1. Lint + typecheck.
2. Unit tests.
3. **Level validation**: JSON Schema + every `solutions` entry replayed headlessly in the engine must produce `target`; `optimal` must match.
4. i18n check: every referenced key exists in `en`.
5. Build.

On merge to `main`: deploy to **GitHub Pages**.
On tag `v*`: build zip → upload to **itch.io** via `butler` (secret `BUTLER_API_KEY`).

---

## 11. Open-source setup

| Item | Choice |
|---|---|
| Code license | MIT |
| Level content license | CC BY 4.0 |
| Language | English everywhere (code, comments, commits, docs, issues) |
| Commits | Conventional Commits |
| Versioning | SemVer, auto-generated CHANGELOG |
| Repo name | `insert-coin-vim` |
| Files | README (playable link + demo GIF at top), LICENSE, CONTRIBUTING.md (incl. "how to add a level"), CODE_OF_CONDUCT.md, SECURITY.md, issue/PR templates |
| Labels | `good first issue`, `level`, `i18n`, `bug`, `engine` |
| Funding | `.github/FUNDING.yml` with Ko-fi + GitHub Sponsors; Ko-fi button in footer and end-of-chapter screen only (never mid-level) |
| itch.io | Pay-what-you-want, $0 minimum |

---

## 12. Roadmap

### Phase 0 — Technical prototype (blocking)
Goal: know what the browser can really do. Deliverable: `docs/phase0-report.md`.
- [ ] CodeMirror 6 + vim mode running in Vite.
- [ ] Support matrix: test every command in section 6 → supported / partial / unsupported.
- [ ] Keystroke recorder + VimGolf-style counter.
- [ ] Buffer vs target comparison + completion detection.
- [ ] Browser-reserved shortcut list (Chrome, Firefox, Edge; normal + fullscreen), incl. `<C-w>`, `<C-r>`, `<C-v>`, `<C-t>`, `<C-n>`.
- [ ] Layout tests: AZERTY, QWERTZ, QWERTY, dead keys.
- [ ] Headless replay of a solution string (for CI).
- [ ] Recommendation: UI framework + which chapters stay in scope.

### Phase 1 — MVP (v0.1)
Engine, scoring, 20 levels (chapters 0–3), results screen with replay, localStorage + export/import, base design system, English locale, GitHub Pages deploy.

### Phase 2 — v1.0
Chapters 4–8, Daily Challenge, Review mode, share text, Display settings, sound, itch.io release, Ko-fi/Sponsors.

### Phase 3 — v1.x
Chapters 9–11, Speedrun, Free Golf, extra locales (French first), LCD olive theme. Then the unlockables of §5.6 (extra themes, badges, initials, attract mode).

### Later / ideas
Global leaderboard (e.g. Supabase free tier), Neovim plugin mode for features the browser can't emulate, community level packs.

---

## 13. Open decisions

- [ ] Fictional corporation name and lore tone.
- [ ] Final display/editor fonts.
- [x] UI framework: vanilla TypeScript.
- [ ] Name availability check: GitHub (free on 2026-11-10, checked by the maintainer), itch.io, domain.
