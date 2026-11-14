import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

describe('Review stale hotkeys', () => {
  it('removes a binding of a missing plugin and moves a renamed command onto its successor', async () => {
    const result = await evalInObsidian({
      callback: async ({ app, lib: { clickElement, waitUntil } }) => {
        const missingPluginId = 'hotkey-cleaner-missing-plugin:run';
        const renamedId = 'hotkey-cleaner:review-stale-hotkey';
        const successorId = 'hotkey-cleaner:review-stale-hotkeys';
        app.hotkeyManager.setHotkeys(missingPluginId, [{ key: 'F7', modifiers: ['Alt'] }]);
        app.hotkeyManager.setHotkeys(renamedId, [{ key: 'F8', modifiers: ['Alt'] }]);
        try {
          app.commands.executeCommandById(successorId);
          function getModal(): HTMLElement | null {
            return activeDocument.querySelector<HTMLElement>('.hotkey-cleaner-modal');
          }
          await waitUntil({ predicate: () => getModal() !== null, timeoutInMilliseconds: 5000 });
          const modal = getModal();
          if (!modal) {
            throw new Error('The review modal did not open');
          }
          const rowNames = [...modal.querySelectorAll('.setting-item-name')].map((element) => element.textContent).filter(Boolean);
          const renamedSelect = [...modal.querySelectorAll('.setting-item')]
            .find((element) => element.textContent.includes(renamedId))
            ?.querySelector('select');
          if (!renamedSelect) {
            throw new Error('No dropdown for the renamed command');
          }
          // A native <select> popup is drawn by the OS, outside the page, so no trusted click can pick an option in it:
          // The value is set directly and its change event dispatched, which is exactly what picking an option does.
          renamedSelect.value = `remap:${successorId}`;
          renamedSelect.dispatchEvent(new Event('change'));
          const applyButton = [...modal.querySelectorAll('button')].find((button) => button.textContent === 'Apply');
          if (!applyButton) {
            throw new Error('No Apply button');
          }
          await clickElement({ element: applyButton });
          await waitUntil({ predicate: () => getModal() === null, timeoutInMilliseconds: 5000 });
          return {
            missingPluginKeys: app.hotkeyManager.customKeys[missingPluginId] ?? null,
            renamedKeys: app.hotkeyManager.customKeys[renamedId] ?? null,
            rowNames,
            successorKeys: app.hotkeyManager.customKeys[successorId] ?? null
          };
        } finally {
          for (const id of [missingPluginId, renamedId, successorId]) {
            app.hotkeyManager.removeHotkeys(id);
          }
          await app.hotkeyManager.save();
        }
      },
      vaultPath: getTemporaryVault().path
    });

    expect(result).toEqual({
      missingPluginKeys: null,
      renamedKeys: null,
      rowNames: ['hotkey-cleaner-missing-plugin:run', 'hotkey-cleaner:review-stale-hotkey (Hotkey Cleaner)'],
      successorKeys: [{ key: 'F8', modifiers: ['Alt'] }]
    });
  });

  it('says so and opens nothing when every binding is live', async () => {
    const result = await evalInObsidian({
      callback: async ({ app, lib: { waitUntil } }) => {
        app.commands.executeCommandById('hotkey-cleaner:review-stale-hotkeys');
        function getNotice(): string | undefined {
          return [...activeDocument.querySelectorAll('.notice')].map((element) => element.textContent).find((text) => text.includes('Every hotkey binding'));
        }
        await waitUntil({ predicate: () => getNotice() !== undefined, timeoutInMilliseconds: 5000 });
        return { hasModal: activeDocument.querySelector('.hotkey-cleaner-modal') !== null, notice: getNotice() };
      },
      vaultPath: getTemporaryVault().path
    });

    expect(result.hasModal).toBe(false);
    expect(result.notice).toContain('Every hotkey binding points at a command that exists.');
  });
});
