import type { App } from 'obsidian';

import type {
  HotkeyAnalysisInput,
  HotkeyChangePlan
} from './stale-hotkeys.ts';

/**
 * Applies a change plan through the hotkey manager and writes `hotkeys.json`.
 *
 * @param app - The app.
 * @param plan - The plan.
 */
export async function applyHotkeyChangePlan(app: App, plan: HotkeyChangePlan): Promise<void> {
  for (const commandId of plan.removedCommandIds) {
    app.hotkeyManager.removeHotkeys(commandId);
  }

  for (const [commandId, hotkeys] of Object.entries(plan.updatedHotkeys)) {
    app.hotkeyManager.setHotkeys(commandId, [...hotkeys]);
  }

  await app.hotkeyManager.save();
}

/**
 * Reads everything the stale-hotkey analysis needs from the app.
 *
 * @param app - The app.
 * @returns The analysis input.
 */
export function readHotkeyAnalysisInput(app: App): HotkeyAnalysisInput {
  return {
    communityPlugins: Object.values(app.plugins.manifests).map((manifest) => ({
      id: manifest.id,
      isEnabled: app.plugins.enabledPlugins.has(manifest.id),
      name: manifest.name
    })),
    corePlugins: Object.entries(app.internalPlugins.plugins).map(([id, plugin]) => ({
      id,
      isEnabled: plugin.enabled,
      name: plugin.instance.name
    })),
    customKeys: app.hotkeyManager.customKeys,
    defaultKeys: app.hotkeyManager.defaultKeys,
    registeredCommands: Object.values(app.commands.commands).map((command) => ({
      id: command.id,
      name: command.name
    }))
  };
}
