/**
 * @file
 *
 * Produces the desktop frames of the review modal, driving a real Obsidian and writing
 * `images/screenshots/screenshot-desktop-N.png`. These frames are the README images and the community
 * directory listing shots.
 *
 * Excluded from `npm run test:integration` by its file name, see the `capture-screenshots:desktop` project in
 * `scripts/vitest-config.ts`. Capturing is an explicit operation (`npm run capture:screenshots`).
 */

import {
  mkdirSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { setTimeout as sleepInNode } from 'node:timers/promises';
import {
  applyObsidianTheme,
  captureObsidianScreenshot,
  evalInObsidian,
  labelScreenshot,
  readPngDimensions
} from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

const WIDTH_IN_PIXELS = 1200;
const HEIGHT_IN_PIXELS = 800;

/**
 * The modal is sized as a fraction of the window, so a narrower window magnifies the rows against the frame.
 */
const CLOSE_UP_WIDTH_IN_PIXELS = 900;
const CLOSE_UP_HEIGHT_IN_PIXELS = 600;

const SETTLE_DELAY_IN_MILLISECONDS = 900;

const IMAGES_DIRECTORY = join(process.cwd(), 'images', 'screenshots');

beforeAll(async () => {
  await applyObsidianTheme({ theme: 'dark', vaultPath: vaultPath() });
  await evalInObsidian({
    callback: ({ app }): void => {
      app.workspace.leftSplit.collapse();
      app.hotkeyManager.setHotkeys('retired-plugin:open-dashboard', [{ key: 'D', modifiers: ['Mod', 'Shift'] }]);
      app.hotkeyManager.setHotkeys('hotkey-cleaner:review-stale-hotkey', [{ key: 'R', modifiers: ['Alt'] }]);
      app.hotkeyManager.setHotkeys('slides:start', [{ key: 'F5', modifiers: [] }]);
      app.hotkeyManager.setHotkeys('app:open-settings', [{ key: 'D', modifiers: ['Mod', 'Shift'] }]);
      app.commands.executeCommandById('hotkey-cleaner:review-stale-hotkeys');
    },
    vaultPath: vaultPath()
  });
});

describe('desktop frames of the review modal', () => {
  it('1 - every stale binding with its reason', async () => {
    await sleepInNode(SETTLE_DELAY_IN_MILLISECONDS);
    expect(await countRows()).toBeGreaterThanOrEqual(3);
    await shoot(1, 'Every hotkey that cannot fire, and why', WIDTH_IN_PIXELS, HEIGHT_IN_PIXELS);
  });

  it('2 - a renamed command moved onto its successor', async () => {
    await evalInObsidian({
      callback: (): void => {
        const select = [...activeDocument.querySelectorAll(':scope .hotkey-cleaner-modal .setting-item')]
          .find((element) => element.textContent.includes('hotkey-cleaner:review-stale-hotkey'))
          ?.querySelector('select');
        if (!select) {
          throw new Error('No dropdown for the renamed command');
        }
        select.value = 'remap:hotkey-cleaner:review-stale-hotkeys';
        select.dispatchEvent(new Event('change'));
      },
      vaultPath: vaultPath()
    });
    await sleepInNode(SETTLE_DELAY_IN_MILLISECONDS);
    await shoot(2, 'Move a renamed command\'s keys to its new id', CLOSE_UP_WIDTH_IN_PIXELS, CLOSE_UP_HEIGHT_IN_PIXELS);
  });
});

async function countRows(): Promise<number> {
  return await evalInObsidian({
    callback: (): number => activeDocument.querySelectorAll(':scope .hotkey-cleaner-modal .setting-item select').length,
    vaultPath: vaultPath()
  });
}

async function shoot(index: number, caption: string, widthInPixels: number, heightInPixels: number): Promise<void> {
  const bytes = await captureObsidianScreenshot({
    heightInPixels,
    vaultPath: vaultPath(),
    widthInPixels
  });
  const labeled = await labelScreenshot(bytes, { text: caption });

  expect(readPngDimensions(labeled)).toStrictEqual({ heightInPixels, widthInPixels });

  mkdirSync(IMAGES_DIRECTORY, { recursive: true });
  writeFileSync(join(IMAGES_DIRECTORY, `screenshot-desktop-${String(index)}.png`), labeled);
}

function vaultPath(): string {
  return getTemporaryVault().path;
}
