# Start here

This is an [Obsidian](https://obsidian.md/) vault that documents the [Hotkey Cleaner](https://github.com/mnaoumov/obsidian-hotkey-cleaner/) plugin by demonstrating it. Every feature has a note that says what it does and why you would want it, and a button you can press to watch it happen.

Obsidian keeps every hotkey you assign in `hotkeys.json`, keyed by command id. When a plugin is removed or renames a command, its bindings stay there, invisible: the Hotkeys tab lists only commands that exist. `Hotkey Cleaner` finds those bindings and lets you remove, move or keep each one.

## Your first minute

Below this paragraph is a **code button** — a captioned rectangle. It is not a picture of a button: **clicking it runs the code**, and the result appears underneath it. The `</>` toggle beside the caption reveals the code it runs, so nothing here is a black box.

```code-button
---
caption: Plant two stale hotkeys and open the review
---
await require('/demoSetup.ts').plantStaleHotkeysAndReview(app);
```

A window titled **Stale hotkeys** should have opened, listing one binding of a plugin that is not installed and one binding of a command this plugin no longer has. That is the **`Hotkey Cleaner`: Review stale hotkeys** command, the same one you can run from the Command Palette (`Ctrl+P` / `Cmd+P`).

Every button in this vault also states its **manual equivalent**, so you learn the real steps rather than depending on the buttons.

## Features

| Note | What it covers |
| --- | --- |
| [01 Review stale hotkeys](<./01 Review stale hotkeys.md>) | Which bindings count as stale, and what Remove, Move and Keep do. |
| [02 Settings](<./02 Settings.md>) | Every setting, by the key it is stored under in `data.json`. |
