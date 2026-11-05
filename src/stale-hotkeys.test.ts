import type { Hotkey } from 'obsidian';

import {
  describe,
  expect,
  it
} from 'vitest';

import type { HotkeyAnalysisInput } from './stale-hotkeys.ts';

import {
  analyzeHotkeys,
  findSuccessorCommandIds,
  formatHotkey,
  isSameHotkey,
  planHotkeyChanges
} from './stale-hotkeys.ts';

const ALT_C: Hotkey = { key: 'c', modifiers: ['Alt'] };
const ALT_V: Hotkey = { key: 'V', modifiers: ['Alt'] };
const MOD_SHIFT_K: Hotkey = { key: 'k', modifiers: ['Mod', 'Shift'] };

function createInput(overrides: Partial<HotkeyAnalysisInput>): HotkeyAnalysisInput {
  return {
    communityPlugins: [],
    corePlugins: [],
    customKeys: {},
    defaultKeys: {},
    registeredCommands: [],
    ...overrides
  };
}

describe('analyzeHotkeys', () => {
  it('reports a binding whose plugin is not installed', () => {
    const result = analyzeHotkeys(createInput({ customKeys: { 'quickadd:run': [ALT_C] } }));
    expect(result).toEqual([{
      commandId: 'quickadd:run',
      conflicts: [],
      hotkeys: [ALT_C],
      pluginId: 'quickadd',
      pluginName: undefined,
      reason: 'missingPlugin',
      successorCommandIds: []
    }]);
  });

  it('reports a renamed command of an enabled plugin with its likely successor', () => {
    const result = analyzeHotkeys(createInput({
      communityPlugins: [{ id: 'ocst', isEnabled: true, name: 'CodeScript Toolkit' }],
      customKeys: { 'ocst:invokeScriptFile-Scripts/foo.ts': [ALT_C] },
      registeredCommands: [
        { id: 'ocst:invoke-script-file-Scripts/foo.ts', name: 'Invoke foo' },
        { id: 'ocst:reload', name: 'Reload' }
      ]
    }));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      pluginName: 'CodeScript Toolkit',
      reason: 'missingCommand',
      successorCommandIds: ['ocst:invoke-script-file-Scripts/foo.ts']
    });
  });

  it('labels a binding of a disabled plugin as disabled, without successors', () => {
    const result = analyzeHotkeys(createInput({
      communityPlugins: [{ id: 'omnisearch', isEnabled: false, name: 'Omnisearch' }],
      customKeys: { 'omnisearch:show-modal': [ALT_C] }
    }));
    expect(result[0]).toMatchObject({ reason: 'disabledPlugin', successorCommandIds: [] });
  });

  it('labels a binding of a turned-off core plugin, and leaves an enabled core plugin alone', () => {
    const result = analyzeHotkeys(createInput({
      corePlugins: [
        { id: 'workspaces', isEnabled: false, name: 'Workspaces' },
        { id: 'file-explorer', isEnabled: true, name: 'Files' }
      ],
      customKeys: {
        'file-explorer:gone': [ALT_C],
        'workspaces:load': [ALT_V]
      }
    }));
    expect(result.map((staleHotkey) => [staleHotkey.commandId, staleHotkey.reason, staleHotkey.pluginName])).toEqual([
      ['workspaces:load', 'disabledCorePlugin', 'Workspaces']
    ]);
  });

  it('never reports a registered command, a built-in prefix, a prefix in use, or an id with no prefix', () => {
    const result = analyzeHotkeys(createInput({
      customKeys: {
        'app:go-back': [],
        'editor:unknown': [ALT_C],
        'live:command': [ALT_C],
        'other:unregistered': [ALT_V],
        'plain-id': [ALT_V]
      },
      registeredCommands: [
        { id: 'live:command', name: 'Live' },
        { id: 'other:registered', name: 'Other' },
        { id: 'plain-registered', name: 'Plain' }
      ]
    }));
    expect(result).toEqual([]);
  });

  it('names the live commands that share a key with a stale binding, custom keys first, then defaults', () => {
    const result = analyzeHotkeys(createInput({
      customKeys: {
        'custom:live': [{ key: 'C', modifiers: ['Alt'] }],
        'gone:command': [ALT_C, MOD_SHIFT_K]
      },
      defaultKeys: {
        'custom:live': [MOD_SHIFT_K],
        'default:live': [{ key: 'k', modifiers: ['Shift', 'Mod'] }]
      },
      registeredCommands: [
        { id: 'custom:live', name: 'Custom' },
        { id: 'default:live', name: 'Default' },
        { id: 'unbound:live', name: 'Unbound' }
      ]
    }));
    expect(result[0]?.conflicts).toEqual([
      { commandId: 'custom:live', hotkey: ALT_C },
      { commandId: 'default:live', hotkey: MOD_SHIFT_K }
    ]);
  });

  it('sorts the result by command id', () => {
    const result = analyzeHotkeys(createInput({ customKeys: { 'a:x': [ALT_C], 'b:x': [ALT_C] } }));
    expect(result.map((staleHotkey) => staleHotkey.commandId)).toEqual(['a:x', 'b:x']);
  });
});

describe('findSuccessorCommandIds', () => {
  it('matches a template folder rename and an id-scheme change by their words', () => {
    expect(findSuccessorCommandIds('templater:insert-Templates/Daily.md', [
      'templater:!Templates/Daily.md',
      'templater:!Templates/Weekly.md',
      'other:insert-Templates/Daily.md'
    ])).toEqual(['templater:!Templates/Daily.md', 'templater:!Templates/Weekly.md']);
  });

  it('drops weak matches, ids with no prefix and the missing id itself, and keeps at most three', () => {
    expect(findSuccessorCommandIds('p:split-file', [
      'p:split-file',
      'p:split-note-file',
      'p:split-current-file',
      'p:file-split',
      'p:split-file-x',
      'p:merge',
      'split-file'
    ])).toEqual(['p:file-split', 'p:split-current-file', 'p:split-file-x']);
  });
});

describe('formatHotkey', () => {
  it('upper-cases a single-letter key and keeps named keys', () => {
    expect(formatHotkey(MOD_SHIFT_K)).toBe('Mod + Shift + K');
    expect(formatHotkey({ key: 'F2', modifiers: [] })).toBe('F2');
  });
});

describe('isSameHotkey', () => {
  it('ignores key case and modifier order', () => {
    expect(isSameHotkey(MOD_SHIFT_K, { key: 'K', modifiers: ['Shift', 'Mod'] })).toBe(true);
    expect(isSameHotkey(MOD_SHIFT_K, { key: 'k', modifiers: ['Mod'] })).toBe(false);
    expect(isSameHotkey(ALT_C, ALT_V)).toBe(false);
  });
});

describe('planHotkeyChanges', () => {
  const staleHotkeys = analyzeHotkeys(createInput({
    customKeys: {
      'a:gone': [ALT_C],
      'b:gone': [ALT_V],
      'c:gone': [ALT_C, MOD_SHIFT_K],
      'd:gone': [MOD_SHIFT_K]
    }
  }));

  it('removes, remaps onto custom or default keys without duplicates, and skips keep and unknown ids', () => {
    const plan = planHotkeyChanges(staleHotkeys, [
      { action: 'remove', commandId: 'a:gone' },
      { action: 'keep', commandId: 'b:gone' },
      { action: 'remap', commandId: 'c:gone', targetCommandId: 'x:live' },
      { action: 'remap', commandId: 'd:gone', targetCommandId: 'x:live' },
      { action: 'remove', commandId: 'unknown:id' }
    ], {
      customKeys: {},
      defaultKeys: { 'x:live': [ALT_C] }
    });
    expect(plan).toEqual({
      removedCommandIds: ['a:gone', 'c:gone', 'd:gone'],
      updatedHotkeys: { 'x:live': [ALT_C, MOD_SHIFT_K] }
    });
  });

  it('starts a remap from the target custom keys, and from nothing when it has no keys', () => {
    const plan = planHotkeyChanges(staleHotkeys, [
      { action: 'remap', commandId: 'a:gone', targetCommandId: 'x:live' },
      { action: 'remap', commandId: 'b:gone', targetCommandId: 'y:live' }
    ], {
      customKeys: { 'x:live': [MOD_SHIFT_K] },
      defaultKeys: { 'x:live': [ALT_V] }
    });
    expect(plan.updatedHotkeys).toEqual({ 'x:live': [MOD_SHIFT_K, ALT_C], 'y:live': [ALT_V] });
  });
});
