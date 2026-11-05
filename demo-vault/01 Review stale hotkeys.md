# Review stale hotkeys

The **`Hotkey Cleaner`: Review stale hotkeys** command lists every binding in `hotkeys.json` whose command cannot run, and lets you decide what happens to each one. Nothing is written until you press **Apply**.

```code-button
---
caption: Plant two stale hotkeys and open the review
---
require('/demoSetup.ts').plantStaleHotkeysAndReview(app);
```

Manual equivalent: run **`Hotkey Cleaner`: Review stale hotkeys** in the Command Palette (`Ctrl+P` / `Cmd+P`). In your own vault there is nothing to plant: removing a plugin, or updating one that renamed a command, leaves its bindings behind by itself.

## What counts as stale

The check runs inside Obsidian, against the commands that are registered once every plugin has loaded, so a binding is judged by whether it can fire rather than by guessing from file names.

| Label in the review | Meaning | Starts as |
| --- | --- | --- |
| No installed plugin has this id. | The plugin was uninstalled. | Remove |
| The plugin is enabled, but has no command with this id any more. | The plugin renamed or dropped the command. | Remove |
| The plugin that owns this command is installed but disabled. | A disabled plugin registers no commands, so the binding is parked rather than broken. | Keep |
| The core plugin that owns this command is turned off. | The same, for a core plugin such as Workspaces. | Keep |

Bindings of built-in commands (`app:`, `editor:`, `workspace:` and the like) and of enabled core plugins are never listed. Neither is an empty list on a live command: that is how Obsidian records that you removed a default hotkey.

When a stale binding uses the same keys as a live command, the review names that command too, so you can see which of the two a key press really runs.

## Remove, Move or Keep

- **Remove** deletes the binding from `hotkeys.json`.
- **Move to ...** appears when the plugin still has a command with a similar id — the same words in a different case or separator, or most of the same words, which is how `invokeScriptFile-x` becomes `invoke-script-file-x` and `Templates/x` becomes `!Templates/x`. It adds the binding's keys to that command, keeping the keys the command already has, and then removes the stale binding.
- **Keep** leaves the binding alone, for a plugin you have only disabled for now.

In the demo above, pick **Move to Review stale hotkeys** for `hotkey-cleaner:review-stale-hotkey` and apply: `Alt + F8` now opens the review.

## Put it back

```code-button
---
caption: Remove the demo hotkeys
---
require('/demoSetup.ts').removePlantedHotkeys(app);
```

Manual equivalent: clear the same bindings in **Settings → Hotkeys**.
