# Settings

Every setting `Hotkey Cleaner` stores, listed by the **key it is written under in `data.json`** rather than by its display label — that is what you see when you open the file, hit a sync conflict, or read a support thread.

Find them in Obsidian under **Settings → Community plugins → `Hotkey Cleaner`**.

## General

- `shouldCheckOnStartup`
  - on or off, shown in the settings tab as **Check on startup**. On by default. When Obsidian starts and its layout is ready, the plugin looks for stale bindings and shows a notice when it finds any. It never changes anything by itself: the review is always opened by the **Review stale hotkeys** command.

## Try it

Change the setting without leaving this note. The change applies live — the plugin's settings component picks it up, so there is no reload.

```code-button
---
caption: Turn the startup check off
---
await require('/demoSetup.ts').setCheckOnStartup(app, false);
```

Manual equivalent: switch off **Check on startup** in the settings tab.

When you are done, put it back:

```code-button
---
caption: Turn the startup check back on
---
await require('/demoSetup.ts').setCheckOnStartup(app, true);
```

Manual equivalent: switch **Check on startup** back on.
