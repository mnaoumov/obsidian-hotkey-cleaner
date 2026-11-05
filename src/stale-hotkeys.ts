import type { Hotkey } from 'obsidian';

/**
 * Prefixes of commands Obsidian registers itself, outside any plugin. A binding under one of them is never
 * reported, even when its command is not registered right now, because the app can register those lazily.
 */
const BUILT_IN_COMMAND_PREFIXES: ReadonlySet<string> = new Set(['app', 'editor', 'markdown', 'theme', 'window', 'workspace']);

const MAX_SUCCESSOR_COUNT = 3;
const MIN_SUCCESSOR_SCORE = 0.5;

/**
 * The Dice coefficient counts each shared word once for each of the two ids.
 */
const DICE_COEFFICIENT_FACTOR = 2;

/**
 * Everything the analysis reads, collected from the app in one place so the analysis itself is pure.
 */
export interface HotkeyAnalysisInput {
  readonly communityPlugins: readonly PluginState[];
  readonly corePlugins: readonly PluginState[];
  readonly customKeys: Readonly<Record<string, readonly Hotkey[]>>;
  readonly defaultKeys: Readonly<Record<string, readonly Hotkey[]>>;
  readonly registeredCommands: readonly RegisteredCommand[];
}

/**
 * The edits to `hotkeys.json` that a set of decisions comes to.
 */
export interface HotkeyChangePlan {
  readonly removedCommandIds: readonly string[];
  readonly updatedHotkeys: Readonly<Record<string, readonly Hotkey[]>>;
}

/**
 * A live command that is bound to the same key as a stale binding.
 */
export interface HotkeyConflict {
  readonly commandId: string;
  readonly hotkey: Hotkey;
}

/**
 * What the user chose for one stale binding.
 */
export type HotkeyDecision = KeepHotkeyDecision | RemapHotkeyDecision | RemoveHotkeyDecision;

/**
 * Leave the binding as it is.
 */
export interface KeepHotkeyDecision {
  readonly action: 'keep';
  readonly commandId: string;
}

/**
 * A plugin, community or core, as the analysis sees it.
 */
export interface PluginState {
  readonly id: string;
  readonly isEnabled: boolean;
  readonly name: string;
}

/**
 * A command currently registered in the app.
 */
export interface RegisteredCommand {
  readonly id: string;
  readonly name: string;
}

/**
 * Move the binding's keys to another command, then drop the binding.
 */
export interface RemapHotkeyDecision {
  readonly action: 'remap';
  readonly commandId: string;
  readonly targetCommandId: string;
}

/**
 * Drop the binding.
 */
export interface RemoveHotkeyDecision {
  readonly action: 'remove';
  readonly commandId: string;
}

/**
 * A binding in `hotkeys.json` that cannot fire as it stands.
 */
export interface StaleHotkey {
  readonly commandId: string;
  readonly conflicts: readonly HotkeyConflict[];
  readonly hotkeys: readonly Hotkey[];
  readonly pluginId: string;
  readonly pluginName: string | undefined;
  readonly reason: StaleHotkeyReason;
  readonly successorCommandIds: readonly string[];
}

/**
 * Why a binding cannot fire.
 *
 * - `disabledCorePlugin`: the command belongs to a core plugin that is turned off.
 * - `disabledPlugin`: the command belongs to a community plugin that is installed but disabled.
 * - `missingCommand`: the plugin is enabled, but registers no command with this id any more.
 * - `missingPlugin`: no installed plugin has this id.
 */
export type StaleHotkeyReason = 'disabledCorePlugin' | 'disabledPlugin' | 'missingCommand' | 'missingPlugin';

/**
 * Finds every binding in `hotkeys.json` whose command cannot fire.
 *
 * A binding to a registered command is live. So is any binding under a built-in prefix (`app:`, `editor:`,
 * ...) or under an enabled core plugin, because those never go stale by a rename the user made. An empty
 * hotkey list on a live command is a deliberate unbinding of a default, and is left alone like any live
 * binding.
 *
 * @param input - The state of the app.
 * @returns The stale bindings, sorted by command id.
 */
export function analyzeHotkeys(input: HotkeyAnalysisInput): StaleHotkey[] {
  const registeredIds = new Set(input.registeredCommands.map((command) => command.id));
  const registeredPrefixes = new Set(input.registeredCommands.map((command) => getCommandPrefix(command.id)));
  const communityPlugins = new Map(input.communityPlugins.map((plugin) => [plugin.id, plugin]));
  const corePlugins = new Map(input.corePlugins.map((plugin) => [plugin.id, plugin]));

  const staleHotkeys: StaleHotkey[] = [];

  const entries = Object.entries(input.customKeys).sort(([a], [b]) => a.localeCompare(b));
  for (const [commandId, hotkeys] of entries) {
    if (registeredIds.has(commandId) || !commandId.includes(':')) {
      continue;
    }

    const pluginId = getCommandPrefix(commandId);
    const communityPlugin = communityPlugins.get(pluginId);
    const corePlugin = corePlugins.get(pluginId);

    let reason: StaleHotkeyReason;
    let pluginName: string | undefined;

    if (communityPlugin) {
      reason = communityPlugin.isEnabled ? 'missingCommand' : 'disabledPlugin';
      pluginName = communityPlugin.name;
    } else if (corePlugin) {
      if (corePlugin.isEnabled) {
        continue;
      }
      reason = 'disabledCorePlugin';
      pluginName = corePlugin.name;
    } else if (BUILT_IN_COMMAND_PREFIXES.has(pluginId) || registeredPrefixes.has(pluginId)) {
      continue;
    } else {
      reason = 'missingPlugin';
    }

    staleHotkeys.push({
      commandId,
      conflicts: findConflicts(hotkeys, input),
      hotkeys,
      pluginId,
      pluginName,
      reason,
      successorCommandIds: reason === 'missingCommand'
        ? findSuccessorCommandIds(commandId, input.registeredCommands.map((command) => command.id))
        : []
    });
  }

  return staleHotkeys;
}

/**
 * Guesses which registered commands a missing command was renamed to.
 *
 * Only commands of the same plugin are candidates. Ids that differ only in case and separators
 * (`invokeScriptFile-x` and `invoke-script-file-x`, `Templates/x` and `!Templates/x`) score 1; anything else
 * is scored by how many words the two ids share.
 *
 * @param missingCommandId - The id of the command that no longer exists.
 * @param registeredCommandIds - The ids of every registered command.
 * @returns Up to three likely successors, best first.
 */
export function findSuccessorCommandIds(missingCommandId: string, registeredCommandIds: readonly string[]): string[] {
  const pluginId = getCommandPrefix(missingCommandId);
  const missingWords = splitIntoWords(getCommandLocalId(missingCommandId));

  return registeredCommandIds
    .filter((id) => id !== missingCommandId && id.includes(':') && getCommandPrefix(id) === pluginId)
    .map((id) => ({ id, score: getSimilarity(missingWords, splitIntoWords(getCommandLocalId(id))) }))
    .filter(({ score }) => score >= MIN_SUCCESSOR_SCORE)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, MAX_SUCCESSOR_COUNT)
    .map(({ id }) => id);
}

/**
 * Formats a hotkey the way the Hotkeys tab shows it, such as `Mod + Shift + K`.
 *
 * @param hotkey - The hotkey.
 * @returns The text.
 */
export function formatHotkey(hotkey: Hotkey): string {
  const key = hotkey.key.length === 1 ? hotkey.key.toUpperCase() : hotkey.key;
  return [...hotkey.modifiers, key].join(' + ');
}

/**
 * Tells whether two hotkeys press the same keys.
 *
 * @param a - One hotkey.
 * @param b - The other hotkey.
 * @returns Whether they are the same.
 */
export function isSameHotkey(a: Hotkey, b: Hotkey): boolean {
  return a.key.toLowerCase() === b.key.toLowerCase() && [...a.modifiers].sort().join('+') === [...b.modifiers].sort().join('+');
}

/**
 * Works out the edits to `hotkeys.json` that a set of decisions comes to.
 *
 * Remove drops the binding. Remap adds its keys to the target's current keys — its custom keys, or its
 * default keys when it has none, so a remap never silently unbinds a default — and drops the binding.
 *
 * @param staleHotkeys - The stale bindings the decisions are about.
 * @param decisions - What the user chose for each one.
 * @param input - The state of the app.
 * @returns The plan.
 */
export function planHotkeyChanges(
  staleHotkeys: readonly StaleHotkey[],
  decisions: readonly HotkeyDecision[],
  input: Pick<HotkeyAnalysisInput, 'customKeys' | 'defaultKeys'>
): HotkeyChangePlan {
  const staleHotkeysById = new Map(staleHotkeys.map((staleHotkey) => [staleHotkey.commandId, staleHotkey]));
  const removedCommandIds: string[] = [];
  const updatedHotkeys: Record<string, Hotkey[]> = {};

  for (const decision of decisions) {
    const staleHotkey = staleHotkeysById.get(decision.commandId);
    if (!staleHotkey || decision.action === 'keep') {
      continue;
    }

    removedCommandIds.push(decision.commandId);

    if (decision.action !== 'remap') {
      continue;
    }

    const targetId = decision.targetCommandId;
    const targetHotkeys = updatedHotkeys[targetId] ?? [...(input.customKeys[targetId] ?? input.defaultKeys[targetId] ?? [])];
    for (const hotkey of staleHotkey.hotkeys) {
      if (targetHotkeys.every((existing) => !isSameHotkey(existing, hotkey))) {
        targetHotkeys.push(hotkey);
      }
    }
    updatedHotkeys[targetId] = targetHotkeys;
  }

  return { removedCommandIds, updatedHotkeys };
}

function findConflicts(hotkeys: readonly Hotkey[], input: HotkeyAnalysisInput): HotkeyConflict[] {
  const conflicts: HotkeyConflict[] = [];
  for (const command of input.registeredCommands) {
    const liveHotkeys = input.customKeys[command.id] ?? input.defaultKeys[command.id] ?? [];
    for (const hotkey of hotkeys) {
      if (liveHotkeys.some((liveHotkey) => isSameHotkey(liveHotkey, hotkey))) {
        conflicts.push({ commandId: command.id, hotkey });
      }
    }
  }
  return conflicts;
}

function getCommandLocalId(commandId: string): string {
  return commandId.slice(commandId.indexOf(':') + 1);
}

function getCommandPrefix(commandId: string): string {
  const separatorIndex = commandId.indexOf(':');
  return separatorIndex === -1 ? commandId : commandId.slice(0, separatorIndex);
}

function getSimilarity(a: readonly string[], b: readonly string[]): number {
  if (a.join('') === b.join('')) {
    return 1;
  }

  const remaining = [...b];
  let sharedCount = 0;
  for (const word of a) {
    const index = remaining.indexOf(word);
    if (index === -1) {
      continue;
    }

    remaining.splice(index, 1);
    sharedCount++;
  }

  return DICE_COEFFICIENT_FACTOR * sharedCount / (a.length + b.length);
}

function splitIntoWords(id: string): string[] {
  return id
    .replaceAll(/(?<lower>[a-z0-9])(?<upper>[A-Z])/gu, '$<lower> $<upper>')
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter(Boolean);
}
