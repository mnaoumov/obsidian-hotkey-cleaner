import type { SettingDefinitionItem } from 'obsidian';

import { PluginSettingsTabBase } from '@mnaoumov/obsidian-lib/plugin/plugin-settings-tab';

import type { PluginSettings } from './plugin-settings.ts';

/**
 * The settings tab is declarative: return one definition per row from `getSettingDefinitionItems()` and
 * Obsidian renders them. `bind` wires a component to a settings property in both directions, so there is
 * no read/write plumbing to maintain.
 */
export class PluginSettingsTab extends PluginSettingsTabBase<PluginSettings> {
  protected override getSettingDefinitionItems(): SettingDefinitionItem[] {
    return [
      this.settingEx({
        desc: 'When Obsidian starts, look for hotkeys whose command no longer exists, and show a notice when there are any. The review itself is always opened by the Review stale hotkeys command.',
        name: 'Check on startup',
        render: (setting) => {
          setting.addToggle((toggle) => {
            this.bind({ propertyName: 'shouldCheckOnStartup', valueComponent: toggle });
          });
        }
      })
    ];
  }
}
