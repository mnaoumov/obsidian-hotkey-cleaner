import { noopAsync } from '@mnaoumov/typescript-lib/function';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import type {
  HotkeyDecision,
  StaleHotkey
} from './stale-hotkeys.ts';

import { StaleHotkeysModal } from './stale-hotkeys-modal.ts';

const ALT_C = { key: 'c', modifiers: ['Alt' as const] };

const STALE_HOTKEYS: StaleHotkey[] = [
  {
    commandId: 'gone:command',
    conflicts: [{ commandId: 'live:command', hotkey: ALT_C }, { commandId: 'nameless:command', hotkey: ALT_C }],
    hotkeys: [ALT_C],
    pluginId: 'gone',
    pluginName: undefined,
    reason: 'missingPlugin',
    successorCommandIds: []
  },
  {
    commandId: 'ocst:old',
    conflicts: [],
    hotkeys: [],
    pluginId: 'ocst',
    pluginName: 'CodeScript Toolkit',
    reason: 'missingCommand',
    successorCommandIds: ['ocst:new']
  },
  {
    commandId: 'omnisearch:show',
    conflicts: [],
    hotkeys: [ALT_C],
    pluginId: 'omnisearch',
    pluginName: 'Omnisearch',
    reason: 'disabledPlugin',
    successorCommandIds: []
  },
  {
    commandId: 'workspaces:load',
    conflicts: [],
    hotkeys: [ALT_C],
    pluginId: 'workspaces',
    pluginName: 'Workspaces',
    reason: 'disabledCorePlugin',
    successorCommandIds: []
  }
];

function createModal(onApply: (decisions: HotkeyDecision[]) => Promise<void>): StaleHotkeysModal {
  const names: Record<string, string> = { 'live:command': 'Live', 'ocst:new': 'New' };
  return new StaleHotkeysModal({
    app: App.createConfigured__().asOriginalType__(),
    getCommandName: (commandId) => names[commandId],
    onApply,
    staleHotkeys: STALE_HOTKEYS
  });
}

function getButton(modal: StaleHotkeysModal, text: string): HTMLButtonElement {
  const button = [...modal.contentEl.querySelectorAll('button')].find((element) => element.textContent === text);
  if (!button) {
    throw new Error(`No ${text} button`);
  }
  return button;
}

describe('StaleHotkeysModal', () => {
  it('removes missing bindings and keeps disabled ones by default', () => {
    const modal = createModal(vi.fn());
    expect(modal.getDecisions()).toEqual([
      { action: 'remove', commandId: 'gone:command' },
      { action: 'remove', commandId: 'ocst:old' },
      { action: 'keep', commandId: 'omnisearch:show' },
      { action: 'keep', commandId: 'workspaces:load' }
    ]);
  });

  it('renders each binding with its reason, keys, conflicts and successor choices', () => {
    const modal = createModal(vi.fn());
    modal.open();
    const text = modal.contentEl.textContent;
    expect(text).toContain('4 hotkey binding(s)');
    expect(text).toContain('No installed plugin has this id.');
    expect(text).toContain('Keys: Alt + C');
    expect(text).toContain('Keys: none (this entry only unbinds a default).');
    expect(text).toContain('Alt + C is also bound to Live (live:command).');
    expect(text).toContain('Alt + C is also bound to nameless:command.');
    expect(text).toContain('ocst:old (CodeScript Toolkit)');
    const successorSelect = modal.contentEl.querySelectorAll('select')[1];
    expect([...successorSelect?.options ?? []].map((option) => option.text)).toEqual(['Keep', 'Remove', 'Move to New (ocst:new)']);
  });

  it('applies the choices made in the dropdowns and closes', () => {
    const onApply = vi.fn(async (): Promise<void> => {
      await noopAsync();
    });
    const modal = createModal(onApply);
    modal.open();
    const selects = modal.contentEl.querySelectorAll('select');
    const choices = ['keep', 'remap:ocst:new', 'remove'];
    for (const [index, value] of choices.entries()) {
      const select = selects[index];
      if (!select) {
        continue;
      }

      select.value = value;
      select.dispatchEvent(new Event('change'));
    }

    getButton(modal, 'Apply').click();

    expect(onApply).toHaveBeenCalledWith([
      { action: 'keep', commandId: 'gone:command' },
      { action: 'remap', commandId: 'ocst:old', targetCommandId: 'ocst:new' },
      { action: 'remove', commandId: 'omnisearch:show' },
      { action: 'keep', commandId: 'workspaces:load' }
    ]);
    expect(modal.contentEl.childElementCount).toBe(0);
  });

  it('closes without applying on Cancel', () => {
    const onApply = vi.fn(async (): Promise<void> => {
      await noopAsync();
    });
    const modal = createModal(onApply);
    modal.open();
    getButton(modal, 'Cancel').click();
    expect(onApply).not.toHaveBeenCalled();
    expect(modal.contentEl.childElementCount).toBe(0);
  });
});
