import type { App } from 'obsidian';

import { noopAsync } from '@mnaoumov/typescript-lib/function';
import { strictProxy } from '@mnaoumov/typescript-test-toolkit/strict-proxy';
import {
  describe,
  expect,
  it,
  vi
} from 'vitest';

import {
  applyHotkeyChangePlan,
  readHotkeyAnalysisInput
} from './hotkey-state.ts';

describe('readHotkeyAnalysisInput', () => {
  it('collects plugins, core plugins, keys and registered commands from the app', () => {
    const customKeys = { 'a:b': [{ key: 'c', modifiers: [] }] };
    const defaultKeys = { 'd:e': [] };
    const app = strictProxy<App>({
      commands: {
        commands: {
          'x:y': { id: 'x:y', name: 'X: Y' }
        }
      },
      hotkeyManager: { customKeys, defaultKeys },
      internalPlugins: {
        plugins: {
          workspaces: { enabled: false, instance: { name: 'Workspaces' } }
        }
      },
      plugins: {
        enabledPlugins: new Set(['on']),
        manifests: {
          off: { id: 'off', name: 'Off' },
          on: { id: 'on', name: 'On' }
        }
      }
    });

    expect(readHotkeyAnalysisInput(app)).toEqual({
      communityPlugins: [
        { id: 'off', isEnabled: false, name: 'Off' },
        { id: 'on', isEnabled: true, name: 'On' }
      ],
      corePlugins: [{ id: 'workspaces', isEnabled: false, name: 'Workspaces' }],
      customKeys,
      defaultKeys,
      registeredCommands: [{ id: 'x:y', name: 'X: Y' }]
    });
  });
});

describe('applyHotkeyChangePlan', () => {
  it('removes, sets and then saves through the hotkey manager', async () => {
    const calls: string[] = [];
    const hotkey = { key: 'c', modifiers: [] };
    const app = strictProxy<App>({
      hotkeyManager: {
        removeHotkeys: vi.fn((commandId: string) => {
          calls.push(`remove ${commandId}`);
        }),
        save: vi.fn(async () => {
          calls.push('save');
          await noopAsync();
        }),
        setHotkeys: vi.fn((commandId: string) => {
          calls.push(`set ${commandId}`);
        })
      }
    });

    await applyHotkeyChangePlan(app, { removedCommandIds: ['a:b'], updatedHotkeys: { 'c:d': [hotkey] } });

    expect(calls).toEqual(['remove a:b', 'set c:d', 'save']);
    expect(app.hotkeyManager.setHotkeys).toHaveBeenCalledWith('c:d', [hotkey]);
  });
});
