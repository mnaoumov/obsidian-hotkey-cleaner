import type { PluginManifest } from 'obsidian';

import { waitForAllAsyncOperations } from '@mnaoumov/typescript-test-toolkit/async-operation-tracking';
import { Plugin as ObsidianPlugin } from 'obsidian';
import {
  App,
  Plugin as PluginHost,
  Workspace
} from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { Plugin } from './plugin.ts';
import { StaleHotkeysReviewer } from './stale-hotkeys-reviewer.ts';

const MANIFEST: PluginManifest = {
  author: 'test',
  description: 'test',
  id: 'test-plugin',
  minAppVersion: '0.0.0',
  name: 'Test Plugin',
  version: '0.0.0'
};

async function loadPlugin(savedData: unknown): Promise<Plugin> {
  const plugin = new Plugin(App.createConfigured__().asOriginalType__(), MANIFEST);
  vi.spyOn(plugin, 'loadData').mockResolvedValue(savedData);
  await plugin.onload();
  return plugin;
}

// `LayoutReadyComponent` defers its callback by a timer, so the test runs that timer itself rather than waiting for it.
async function setLayoutReady(plugin: Plugin): Promise<void> {
  vi.useFakeTimers();
  try {
    Workspace.fromOriginalType2__(plugin.app.workspace).setLayoutReady__();
    vi.runAllTimers();
  } finally {
    vi.useRealTimers();
  }
  await waitForAllAsyncOperations();
}

// The first test loads the whole plugin module graph cold, which can pass the 5s default on a loaded machine.
describe('HotkeyCleaner', { timeout: 30_000 }, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('extends the Obsidian Plugin class', () => {
    expect(Plugin.prototype).toBeInstanceOf(ObsidianPlugin);
  });

  // The plugin's own `onload` runs here, so this proves the commands are registered, not only imported.
  it('registers the Review stale hotkeys and Report a bug commands', async () => {
    const reviewSpy = vi.spyOn(StaleHotkeysReviewer.prototype, 'review').mockReturnValue(null);
    const plugin = await loadPlugin(undefined);
    const commands = PluginHost.fromOriginalType2__(plugin).commands__;
    expect(commands.has('report-bug')).toBe(true);
    commands.get('review-stale-hotkeys')?.checkCallback?.(false);
    expect(reviewSpy).toHaveBeenCalledOnce();
    plugin.unload();
  });

  it('checks for stale hotkeys once the layout is ready', async () => {
    const notifySpy = vi.spyOn(StaleHotkeysReviewer.prototype, 'notifyIfStale').mockReturnValue(undefined);
    const plugin = await loadPlugin(undefined);
    expect(notifySpy).not.toHaveBeenCalled();
    await setLayoutReady(plugin);
    expect(notifySpy).toHaveBeenCalledOnce();
    plugin.unload();
  });

  it('skips the startup check when it is turned off', async () => {
    const notifySpy = vi.spyOn(StaleHotkeysReviewer.prototype, 'notifyIfStale').mockReturnValue(undefined);
    const plugin = await loadPlugin({ shouldCheckOnStartup: false });
    await setLayoutReady(plugin);
    expect(notifySpy).not.toHaveBeenCalled();
    plugin.unload();
  });
});
