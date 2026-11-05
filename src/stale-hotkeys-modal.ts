import type { App } from 'obsidian';

import {
  Modal,
  Setting
} from 'obsidian';

import type {
  HotkeyDecision,
  StaleHotkey,
  StaleHotkeyReason
} from './stale-hotkeys.ts';

import { formatHotkey } from './stale-hotkeys.ts';

const KEEP_VALUE = 'keep';
const REMOVE_VALUE = 'remove';
const REMAP_VALUE_PREFIX = 'remap:';

const REASON_TEXTS: Readonly<Record<StaleHotkeyReason, string>> = {
  disabledCorePlugin: 'The core plugin that owns this command is turned off.',
  disabledPlugin: 'The plugin that owns this command is installed but disabled.',
  missingCommand: 'The plugin is enabled, but has no command with this id any more.',
  missingPlugin: 'No installed plugin has this id.'
};

interface StaleHotkeysModalConstructorParams {
  readonly app: App;
  readonly getCommandName: (commandId: string) => string | undefined;
  readonly onApply: (decisions: HotkeyDecision[]) => void;
  readonly staleHotkeys: readonly StaleHotkey[];
}

/**
 * One stale binding in the modal, with the decision its dropdown currently shows.
 */
class StaleHotkeyRow {
  public decision: HotkeyDecision;

  public constructor(public readonly staleHotkey: StaleHotkey) {
    this.decision = getDefaultDecision(staleHotkey);
  }
}

/**
 * Lists the stale bindings, and lets the user remove, remap or keep each one. Nothing is written until
 * Apply is pressed.
 */
export class StaleHotkeysModal extends Modal {
  private readonly getCommandName: (commandId: string) => string | undefined;
  private readonly onApply: (decisions: HotkeyDecision[]) => void;
  private readonly rows: readonly StaleHotkeyRow[];

  public constructor(params: StaleHotkeysModalConstructorParams) {
    super(params.app);
    this.getCommandName = params.getCommandName;
    this.onApply = params.onApply;
    this.rows = params.staleHotkeys.map((staleHotkey) => new StaleHotkeyRow(staleHotkey));
  }

  /**
   * Turns the choices made in the modal into decisions.
   *
   * @returns One decision per stale binding.
   */
  public getDecisions(): HotkeyDecision[] {
    return this.rows.map((row) => row.decision);
  }

  public override onClose(): void {
    this.contentEl.empty();
  }

  public override onOpen(): void {
    this.setTitle('Stale hotkeys');
    this.contentEl.addClass('hotkey-cleaner-modal');
    this.contentEl.createEl('p', {
      text: `${String(this.rows.length)} hotkey binding(s) point at commands that cannot run. Choose what to do with each one, then apply.`
    });

    for (const row of this.rows) {
      this.renderRow(row);
    }

    new Setting(this.contentEl)
      .addButton((button) => {
        button.setButtonText('Cancel').onClick(() => {
          this.close();
        });
      })
      .addButton((button) => {
        button.setButtonText('Apply').setCta().onClick(() => {
          this.onApply(this.getDecisions());
          this.close();
        });
      });
  }

  private getCommandLabel(commandId: string): string {
    const name = this.getCommandName(commandId);
    return name ? `${name} (${commandId})` : commandId;
  }

  private renderRow(row: StaleHotkeyRow): void {
    const { staleHotkey } = row;
    const description = createFragment((fragment) => {
      fragment.createDiv({ text: REASON_TEXTS[staleHotkey.reason] });
      fragment.createDiv({
        text: staleHotkey.hotkeys.length === 0
          ? 'Keys: none (this entry only unbinds a default).'
          : `Keys: ${staleHotkey.hotkeys.map((hotkey) => formatHotkey(hotkey)).join(', ')}`
      });
      for (const conflict of staleHotkey.conflicts) {
        fragment.createDiv({
          text: `${formatHotkey(conflict.hotkey)} is also bound to ${this.getCommandLabel(conflict.commandId)}.`
        });
      }
    });

    new Setting(this.contentEl)
      .setName(staleHotkey.pluginName ? `${staleHotkey.commandId} (${staleHotkey.pluginName})` : staleHotkey.commandId)
      .setDesc(description)
      .addDropdown((dropdown) => {
        dropdown.addOption(KEEP_VALUE, 'Keep');
        dropdown.addOption(REMOVE_VALUE, 'Remove');
        for (const successorCommandId of staleHotkey.successorCommandIds) {
          dropdown.addOption(`${REMAP_VALUE_PREFIX}${successorCommandId}`, `Move to ${this.getCommandLabel(successorCommandId)}`);
        }
        // The starting decision is always Keep or Remove, whose dropdown values are the action names.
        dropdown.setValue(row.decision.action);
        dropdown.onChange((value) => {
          row.decision = toDecision(staleHotkey.commandId, value);
        });
      });
  }
}

function getDefaultDecision(staleHotkey: StaleHotkey): HotkeyDecision {
  const { commandId, reason } = staleHotkey;
  return reason === 'missingCommand' || reason === 'missingPlugin' ? { action: 'remove', commandId } : { action: 'keep', commandId };
}

function toDecision(commandId: string, value: string): HotkeyDecision {
  if (value.startsWith(REMAP_VALUE_PREFIX)) {
    return { action: 'remap', commandId, targetCommandId: value.slice(REMAP_VALUE_PREFIX.length) };
  }
  return value === REMOVE_VALUE ? { action: 'remove', commandId } : { action: 'keep', commandId };
}
