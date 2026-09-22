# Contributing to Arvudoro

Thanks for helping! Issues and pull requests are welcome in English or
Portuguese.

## Setup

```sh
curl -fsSL https://tinyjs.app/install | sh   # tinyjs CLI (Linux, macOS, Windows beta)
git clone git@github.com:samoaste/arvudoro.git && cd arvudoro
tinyjs dev    # opens the app with hot reload
npm test      # Node 22+
```

On Linux you need the WebKitGTK runtime: `sudo apt install libwebkit2gtk-4.1-0`.

The repository ships the tinyjs skill for AI coding assistants in `.claude/`
and `.agents/`, so tools like Claude Code pick up the framework's API and
gotchas automatically.

## How the code is laid out

| File | What it does |
|---|---|
| `src/main.js` | Backend (txiki.js, not Node). Owns the timer: phase, round and a wall-clock deadline, so hidden windows and sleep can't drift it. Tray, notifications, settings and SQLite stats. |
| `src/frontend/app.js` | The page: views, break flow, set tracking, settings form, stats. |
| `src/frontend/rig.js` | Stick-figure rig: pose → joint positions → SVG, plus the keyframe player. |
| `src/frontend/exercises.js` | The exercise catalog. |
| `src/frontend/rotation.js` | Picking rules (tested in `test/`). |
| `src/frontend/i18n.js` | UI strings, English and Brazilian Portuguese. |

## Adding an exercise

Exercises must be **compound** (several joints and muscle groups) and need at
most dumbbells, a pull-up bar, a jump rope or bodyweight.

1. Add an entry to `EXERCISES` in `src/frontend/exercises.js`: `id`, `name`
   and `cues` in `en` and `pt`, `equipment`, `group` (`full`, `lower`,
   `upper`, `posterior`, `core`, `cardio`), `mode` (`reps` or `time`),
   `sets`, `amount`, `perSide` if it alternates, and `props` for what the
   figure holds (`db2` two dumbbells, `db1` one in both hands, `dbR` one in
   the near hand, `rope`). Hanging moves set `bar` (height of the bar).
2. Describe the motion as `frames`: poses plus how long to move to the next
   one (`F(pose, moveMs, holdMs)`). A pose is a set of joint angles in
   degrees — **0 points down, 90 forward, 180 up, −90 back**:
   - `t` torso, `h` head tilt
   - `aR`/`aL` `[upper arm, elbow bend]` (near and far arm)
   - `lR`/`lL` `[thigh, knee bend]`, `fR`/`fL` foot angle
   - `dx`/`dy` shift (jumps), `sR`/`sL` arm projection (arms moving sideways)

   Start from the shared poses (`stand`, `squat`, `hinge`, `plank`,
   `pushBottom`, `floorSquat`) and override what changes.
3. Preview every exercise at once: run `python3 -m http.server 8765` in the
   project root and open `http://localhost:8765/dev/sheet.html?ids=your-id&n=12`
   (12 frames across the loop) or `dev/preview.html` (live animation).
4. Run `npm test`. It checks that every entry is complete.

Cues are short imperatives, at most three, and each one names the key
coaching point (e.g. "Front shin stays vertical").

## Adding a language

Copy the `en` block in `src/frontend/i18n.js`, translate it, add the option
to the `language` select in `app.js` and the tray strings in `src/main.js`,
and add names and cues for that language to every exercise.

## Pull requests

- One topic per PR; describe what changed and how you checked it (a
  screenshot helps for UI and animation changes).
- Keep the Arvucore design rules: square corners, tokens from `colors.css`,
  Ember (orange) only for the single primary action of a screen.
- Commit messages: imperative and short (`Add kettlebell-free Turkish get-up`).

## Releases (maintainers)

See [packaging/README.md](packaging/README.md).
