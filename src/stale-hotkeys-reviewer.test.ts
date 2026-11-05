import type { PluginNoticeComponent } from '@mnaoumov/obsidian-lib/components/plugin-notice-component';
import type {
  App as AppOriginal,
  Hotkey,
  Notice
} from 'obsidian';

import { strictProxy } from '@mnaoumov/typescript-test-toolkit/strict-proxy';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { StaleHotkeysReviewer } from './stale-hotkeys-reviewer.ts';

const ALT_C: Hotkey = { key: 'c', modifiers: ['Alt'] };

interface Fixture {
  readonly app: AppOriginal;
  readonly customKeys: Record<string, Hotkey[]>;
  readonly notices: string[];
  readonly reviewer: StaleHotkeysReviewer;
  readonly saves: number[];
}

function createFixture(customKeys: Record<string, Hotkey[]>): Fixture {
  const app = App.createConfigured__().asOriginalType__();
  const saves: number[] = [];
  Object.assign(app, {
    commands: { commands: { 'ocst:new': { id: 'ocst:new', name: 'New' } } },
    hotkeyManager: {
      customKeys,
      defaultKeys: {},
      removeHotkeys: (commandId: string): void => {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- The fake mirrors the real manager, which deletes the entry.
        delete customKeys[commandId];
      },
      save: (): void => {
        saves.push(saves.length);
      },
      setHotkeys: (commandId: string, hotkeys: Hotkey[]): void => {
        customKeys[commandId] = hotkeys;
      }
    },
    internalPlugins: { plugins: {} },
    plugins: {
      enabledPlugins: new Set(['ocst']),
      manifests: { ocst: { id: 'ocst', name: 'CodeScript Toolkit' } }
    }
  });
  const notices: string[] = [];
  const pluginNoticeComponent = strictProxy<PluginNoticeComponent>({
    showNotice: vi.fn((message: DocumentFragment | string) => {
      notices.push(typeof message === 'string' ? message : message.textContent);
      return strictProxy<Notice>({});
    })
  });
  return { app, customKeys, notices, reviewer: new StaleHotkeysReviewer({ app, pluginNoticeComponent }), saves };
}

describe('StaleHotkeysReviewer', () => {
  it('says so and opens nothing when no binding is stale', () => {
    const fixture = createFixture({ 'ocst:new': [ALT_C] });
    expect(fixture.reviewer.review()).toBeNull();
    expect(fixture.notices).toEqual(['Every hotkey binding points at a command that exists.']);
  });

  it('opens the review, and Apply removes and remaps through the hotkey manager', () => {
    const fixture = createFixture({ 'ocst:invokeOld': [ALT_C], 'ocst:new-command': [ALT_C], 'quickadd:run': [ALT_C] });
    const modal = fixture.reviewer.review();
    expect(modal?.contentEl.textContent).toContain('3 hotkey binding(s)');
    expect(modal?.contentEl.textContent).toContain('ocst:new-command (CodeScript Toolkit)');
    const options = [...modal?.contentEl.querySelectorAll('option') ?? []].map((option) => option.text);
    expect(options).toContain('Move to New (ocst:new)');

    fixture.reviewer.applyDecisions(fixture.reviewer.findStaleHotkeys(), [
      { action: 'keep', commandId: 'ocst:invokeOld' },
      { action: 'remap', commandId: 'ocst:new-command', targetCommandId: 'ocst:new' },
      { action: 'remove', commandId: 'quickadd:run' }
    ]);

    expect(fixture.customKeys).toEqual({ 'ocst:invokeOld': [ALT_C], 'ocst:new': [ALT_C] });
    expect(fixture.saves).toHaveLength(1);
    expect(fixture.notices).toEqual(['Removed 1 and moved 1 stale hotkey binding(s).']);
  });

  it('applies through the modal Apply button', () => {
    const fixture = createFixture({ 'quickadd:run': [ALT_C] });
    const modal = fixture.reviewer.review();
    const apply = [...modal?.contentEl.querySelectorAll('button') ?? []].find((button) => button.textContent === 'Apply');
    apply?.click();
    expect(fixture.customKeys).toEqual({});
  });

  it('notifies at startup only when something is stale', () => {
    const clean = createFixture({ 'ocst:new': [ALT_C] });
    clean.reviewer.notifyIfStale();
    expect(clean.notices).toEqual([]);

    const stale = createFixture({ 'quickadd:run': [ALT_C] });
    stale.reviewer.notifyIfStale();
    expect(stale.notices).toEqual(['1 hotkey binding(s) point at commands that cannot run. Run the Review stale hotkeys command to clean them up.']);
  });

  it('writes nothing when every decision is keep', () => {
    const fixture = createFixture({ 'quickadd:run': [ALT_C] });
    fixture.reviewer.applyDecisions(fixture.reviewer.findStaleHotkeys(), [{ action: 'keep', commandId: 'quickadd:run' }]);
    expect(fixture.saves).toHaveLength(0);
    expect(fixture.notices).toEqual(['No hotkeys were changed.']);
  });
});
