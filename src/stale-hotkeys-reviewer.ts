import type { PluginNoticeComponent } from '@mnaoumov/obsidian-lib/components/plugin-notice-component';
import type { App } from 'obsidian';

import type {
  HotkeyDecision,
  StaleHotkey
} from './stale-hotkeys.ts';

import {
  applyHotkeyChangePlan,
  readHotkeyAnalysisInput
} from './hotkey-state.ts';
import { StaleHotkeysModal } from './stale-hotkeys-modal.ts';
import {
  analyzeHotkeys,
  planHotkeyChanges
} from './stale-hotkeys.ts';

interface StaleHotkeysReviewerConstructorParams {
  readonly app: App;
  readonly pluginNoticeComponent: PluginNoticeComponent;
}

/**
 * Finds the stale bindings, shows them for review, and applies what the user chose.
 */
export class StaleHotkeysReviewer {
  private readonly app: App;
  private readonly pluginNoticeComponent: PluginNoticeComponent;

  public constructor(params: StaleHotkeysReviewerConstructorParams) {
    this.app = params.app;
    this.pluginNoticeComponent = params.pluginNoticeComponent;
  }

  /**
   * Applies the user's decisions to `hotkeys.json` and reports what changed.
   *
   * @param staleHotkeys - The stale bindings the decisions are about.
   * @param decisions - The decisions.
   */
  public applyDecisions(staleHotkeys: readonly StaleHotkey[], decisions: readonly HotkeyDecision[]): void {
    const plan = planHotkeyChanges(staleHotkeys, decisions, readHotkeyAnalysisInput(this.app));
    if (plan.removedCommandIds.length === 0) {
      this.pluginNoticeComponent.showNotice('No hotkeys were changed.');
      return;
    }

    applyHotkeyChangePlan(this.app, plan);
    const remappedCount = decisions.filter((decision) => decision.action === 'remap').length;
    const removedCount = plan.removedCommandIds.length - remappedCount;
    this.pluginNoticeComponent.showNotice(`Removed ${String(removedCount)} and moved ${String(remappedCount)} stale hotkey binding(s).`);
  }

  /**
   * Finds the stale bindings.
   *
   * @returns The stale bindings.
   */
  public findStaleHotkeys(): StaleHotkey[] {
    return analyzeHotkeys(readHotkeyAnalysisInput(this.app));
  }

  /**
   * Shows a notice when some bindings are stale, and stays silent otherwise. Run once the layout is ready.
   */
  public notifyIfStale(): void {
    const count = this.findStaleHotkeys().length;
    if (count > 0) {
      this.pluginNoticeComponent.showNotice(
        `${String(count)} hotkey binding(s) point at commands that cannot run. Run the Review stale hotkeys command to clean them up.`
      );
    }
  }

  /**
   * Opens the review modal, or says there is nothing to review.
   *
   * @returns The modal, or `null` when nothing is stale.
   */
  public review(): null | StaleHotkeysModal {
    const input = readHotkeyAnalysisInput(this.app);
    const staleHotkeys = analyzeHotkeys(input);
    if (staleHotkeys.length === 0) {
      this.pluginNoticeComponent.showNotice('Every hotkey binding points at a command that exists.');
      return null;
    }

    const commandNames = new Map(input.registeredCommands.map((command) => [command.id, command.name]));
    const modal = new StaleHotkeysModal({
      app: this.app,
      getCommandName: (commandId): string | undefined => commandNames.get(commandId),
      onApply: (decisions): void => {
        this.applyDecisions(staleHotkeys, decisions);
      },
      staleHotkeys
    });
    modal.open();
    return modal;
  }
}
