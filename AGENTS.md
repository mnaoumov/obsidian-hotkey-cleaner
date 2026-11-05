# Hotkey Cleaner

Follow the shared Obsidian workspace conventions.

## Architecture

- `src/stale-hotkeys.ts` is pure: `analyzeHotkeys` labels each `hotkeys.json` binding (missing plugin, missing command, disabled plugin, disabled core plugin), `findSuccessorCommandIds` guesses a renamed command's successor within the same plugin, and `planHotkeyChanges` turns the user's decisions into removals and updated key lists.
- `src/hotkey-state.ts` is the only code that reads or writes app internals: it collects the analysis input from `app.plugins`, `app.internalPlugins`, `app.commands` and `app.hotkeyManager`, and applies a plan through `removeHotkeys`, `setHotkeys` and `save`.
- `src/stale-hotkeys-reviewer.ts` wires the two to the review modal (`src/stale-hotkeys-modal.ts`) and to the startup notice, which runs from a `CallbackLayoutReadyComponent` so every plugin has registered its commands first.

Built-in prefixes (`app`, `editor`, `markdown`, `theme`, `window`, `workspace`), enabled core plugins and any prefix that has a registered command are never reported. A remap merges into the target's custom keys, or its default keys when it has none, so a default is never silently unbound.

## Validation

The standard gate, the desktop integration suite (`review-stale-hotkeys.desktop.integration.test.ts` drives the real modal) and the demo-vault button suite. The demo-vault suite needs `fix-require-modules` in `demo-vault/.obsidian/plugins/`; its setup error prints the `bootstrap-demo-vault` command that installs it.
