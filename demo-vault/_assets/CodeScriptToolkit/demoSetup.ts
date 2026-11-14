import type {
  App,
  Hotkey
} from 'obsidian';

import { configureCommunityPlugin } from '@mnaoumov/obsidian-lib/community-plugins';
import { Notice } from 'obsidian';

// Shared code for every `code-button` in this vault, so each note's button stays a one-liner instead of a
// Block copy-pasted across notes.
//
// The plugin id has to match `manifest.json` exactly: commands are keyed by it, and so is `data.json`.
const PLUGIN_ID = 'hotkey-cleaner';

/**
 * The stale bindings the demo plants, one of each kind the plugin can demonstrate in this vault.
 *
 * - A command of a plugin that is not installed at all.
 * - A command id this plugin no longer has, one letter short of the real `review-stale-hotkeys`, which the
 *   Review offers as its successor.
 */
const PLANTED_HOTKEYS: Readonly<Record<string, Hotkey[]>> = {
  [`${PLUGIN_ID}:review-stale-hotkey`]: [{ key: 'F8', modifiers: ['Alt'] }],
  'uninstalled-demo-plugin:run': [{ key: 'P', modifiers: ['Mod'] }]
};

const REVIEW_COMMAND_ID = `${PLUGIN_ID}:review-stale-hotkeys`;

/**
 * Writes the demo's stale bindings into `hotkeys.json` and opens the review.
 *
 * Manual equivalent: none is needed in a real vault, which collects stale bindings by itself as plugins are
 * removed and renamed. Then run `Hotkey Cleaner: Review stale hotkeys` in the Command Palette.
 */
export async function plantStaleHotkeysAndReview(app: App): Promise<void> {
  for (const [commandId, hotkeys] of Object.entries(PLANTED_HOTKEYS)) {
    app.hotkeyManager.setHotkeys(commandId, hotkeys);
  }
  await app.hotkeyManager.save();
  app.commands.executeCommandById(REVIEW_COMMAND_ID);
}

/**
 * Removes whatever the demo planted, and anything it moved onto `Review stale hotkeys`, so exploring the
 * vault leaves its hotkeys as you found them.
 *
 * Manual equivalent: clear the same bindings in **Settings -> Hotkeys**.
 */
export async function removePlantedHotkeys(app: App): Promise<void> {
  for (const commandId of [...Object.keys(PLANTED_HOTKEYS), REVIEW_COMMAND_ID]) {
    app.hotkeyManager.removeHotkeys(commandId);
  }
  await app.hotkeyManager.save();
  new Notice('The demo hotkeys are gone.');
}

/**
 * Turns the startup check on or off.
 *
 * `configureCommunityPlugin` routes through the plugin's own settings component while it is loaded, so the
 * change applies live -- no window reload, and no writing `data.json` behind a running plugin's back, which
 * it would overwrite from memory as it unloads.
 *
 * Manual equivalent: the **Check on startup** toggle in **Settings -> Community plugins -> Hotkey Cleaner**.
 */
export async function setCheckOnStartup(app: App, value: boolean): Promise<void> {
  await configureCommunityPlugin({ app, pluginId: PLUGIN_ID, settings: { shouldCheckOnStartup: value } });
  new Notice(`shouldCheckOnStartup is now ${String(value)}. It is live -- no reload needed.`);
}
