import { GlobalCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/global-command-handler';

import type { StaleHotkeysReviewer } from './stale-hotkeys-reviewer.ts';

/**
 * The command that opens the stale-hotkey review.
 */
export class ReviewStaleHotkeysCommandHandler extends GlobalCommandHandler {
  private readonly reviewer: StaleHotkeysReviewer;

  public constructor(reviewer: StaleHotkeysReviewer) {
    super({
      icon: 'keyboard',
      id: 'review-stale-hotkeys',
      name: 'Review stale hotkeys'
    });
    this.reviewer = reviewer;
  }

  protected override execute(): void {
    this.reviewer.review();
  }
}
