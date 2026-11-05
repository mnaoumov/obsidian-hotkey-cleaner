import { OpenBugReportCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/open-bug-report-command-handler';
import { OpenDemoVaultCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/open-demo-vault-command-handler';
import { CallbackLayoutReadyComponent } from '@mnaoumov/obsidian-lib/components/layout-ready-component';
import { PluginSettingsTabComponent } from '@mnaoumov/obsidian-lib/components/plugin-settings-tab-component';
import { PluginDataHandler } from '@mnaoumov/obsidian-lib/data-handler';
import { PluginBase } from '@mnaoumov/obsidian-lib/plugin/plugin';
import { PluginEventSourceImpl } from '@mnaoumov/obsidian-lib/plugin/plugin-event-source';

import { PluginSettingsComponent } from './plugin-settings-component.ts';
import { PluginSettingsTab } from './plugin-settings-tab.ts';
import { ReviewStaleHotkeysCommandHandler } from './review-stale-hotkeys-command-handler.ts';
import { StaleHotkeysReviewer } from './stale-hotkeys-reviewer.ts';

export class Plugin extends PluginBase {
  protected override async onloadImpl(): Promise<void> {
    const pluginSettingsComponent = this.addChild(
      new PluginSettingsComponent({
        dataHandler: new PluginDataHandler(this),
        pluginEventSource: new PluginEventSourceImpl(this)
      })
    );
    this.pluginSettingsComponent = pluginSettingsComponent;

    this.addChild(
      new PluginSettingsTabComponent({
        plugin: this,
        pluginSettingsTab: new PluginSettingsTab({
          plugin: this,
          pluginSettingsComponent
        })
      })
    );

    const reviewer = new StaleHotkeysReviewer({
      app: this.app,
      pluginNoticeComponent: this.pluginNoticeComponent
    });

    // Every plugin has registered its commands by the time the layout is ready, so a binding that is still
    // Unresolved then is stale rather than early.
    this.addChild(
      new CallbackLayoutReadyComponent(this.app, () => {
        if (pluginSettingsComponent.settings.shouldCheckOnStartup) {
          reviewer.notifyIfStale();
        }
      })
    );

    await this.commandHandlerComponent.registerCommandHandlers(() => [
      new ReviewStaleHotkeysCommandHandler(reviewer),
      // `OpenBugReportCommandHandler` opens the bug form in `.github/ISSUE_TEMPLATE/` with the plugin version, the
      // Obsidian version and the operating system already filled in, which is why it is registered only with the forms.
      new OpenBugReportCommandHandler({
        app: this.app,
        gitHubRepo: 'mnaoumov/obsidian-hotkey-cleaner',
        pluginId: this.manifest.id
      }),
      new OpenDemoVaultCommandHandler({
        app: this.app,
        pluginId: this.manifest.id,
        pluginNoticeComponent: this.pluginNoticeComponent,
        pluginVersion: this.manifest.version
      })
    ]);
  }
}
