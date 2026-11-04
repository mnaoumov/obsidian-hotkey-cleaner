# Hotkey Cleaner

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/mnaoumov) [![GitHub release](https://img.shields.io/github/v/release/mnaoumov/obsidian-hotkey-cleaner)](https://github.com/mnaoumov/obsidian-hotkey-cleaner/releases) [![GitHub downloads](https://img.shields.io/github/downloads/mnaoumov/obsidian-hotkey-cleaner/total)](https://github.com/mnaoumov/obsidian-hotkey-cleaner/releases)

Finds hotkeys whose command no longer exists, and lets you remove, remap or keep each one.

## Demo vault

**The documentation is a demo vault.** Every feature has a note that explains what it does and why you would want it, with a button you can press to watch it happen.

**[Start reading here](<./demo-vault/00 Start.md>)** — it is plain markdown, so it works on `GitHub` with nothing installed.

A copy of the vault ships with every release. You can access it via any of the following:

1. Running the **`Hotkey Cleaner`: Open demo vault** command.
2. Downloading `hotkey-cleaner-demo-vault.zip` from the [Releases](https://github.com/mnaoumov/obsidian-hotkey-cleaner/releases). It unzips into a single `hotkey-cleaner-demo-vault-<version>` folder.
3. Browsing its source in [`demo-vault/`](./demo-vault/README.md) in this repository.

## See also

[My other Obsidian resources](https://mnaoumov.dev/obsidian/)

<!-- Before publishing, search the community plugin directory (https://community.obsidian.md/plugins) and GitHub for similar plugins. Replace the null form below with a table when candidates exist. Sort rows alphabetically by plugin display name; link listed plugins to the store and unlisted ones to their repository. Add (my plugin) or (maintained by me) after the link where applicable. -->
<!-- Use these columns: Plugin | Features | How `Hotkey Cleaner` differs. Keep cells short, with semicolon-separated fragments. Start each difference with the relationship to the other plugin, then what this one adds or omits. Use Supersedes for a retired or fully covered plugin, Extends for an active plugin it builds on, or a concrete relation such as Same goal as or Narrower than. -->
<!-- Close a populated table with "Last searched for similar plugins on YYYY-MM-DD." When the search finds nothing, keep the sentence below and replace its date. The resources link stays first in either case. -->

No similar plugin was found when this was last searched for, on YYYY-MM-DD.

## Installation

The plugin is not available in [the official Community Plugins repository](https://community.obsidian.md) yet.

### Beta versions

To install the latest beta release of this plugin (regardless if it is available in [the official Community Plugins repository](https://community.obsidian.md) or not), follow these steps:

1. Ensure you have the [BRAT plugin](https://community.obsidian.md/plugins/obsidian42-brat) installed and enabled.
2. Click [Install via BRAT](https://intradeus.github.io/http-protocol-redirector?r=obsidian://brat?plugin=https://github.com/mnaoumov/obsidian-hotkey-cleaner).
3. An Obsidian pop-up window should appear. In the window, click the `Add plugin` button once and wait a few seconds for the plugin to install.

## Development checks

Run `npm run check` to run release checks and reproduce the Community directory scanner's findings locally with `check-plugin --scanner`. See [CONTRIBUTING](./CONTRIBUTING.md) for setup. The scanner needs network access and installs its linters on each run, which can take a few minutes.

## Debugging

By default, debug messages for this plugin (id: `hotkey-cleaner`) are hidden.

If you need to enable them refer to the [documentation](https://mnaoumov.dev/obsidian-lib/guides/debugging/).

## Contributing

Contributions are welcome — see [CONTRIBUTING](./CONTRIBUTING.md) to get set up.

## Support

<!-- markdownlint-disable MD033 -->

<a href="https://www.buymeacoffee.com/mnaoumov" target="_blank">Support this plugin</a>

<!-- markdownlint-enable MD033 -->

### Filing an issue (for AI agents and humans)

Open issues through the [issue forms](https://github.com/mnaoumov/obsidian-hotkey-cleaner/issues/new/choose), not as blank issues.

To report a bug from inside Obsidian, run the **`Hotkey Cleaner`: Report a bug** command. It opens the bug form with the plugin version, the Obsidian version and your operating system already filled in.

Filing from the CLI or the API (`gh issue create --body`, or an AI agent filing for you) skips the form, and `gh issue create --template` cannot load an issue form. In that case, open the matching form in [`.github/ISSUE_TEMPLATE/`](https://github.com/mnaoumov/obsidian-hotkey-cleaner/tree/HEAD/.github/ISSUE_TEMPLATE), copy every field as a `### <label>` heading in the form's order, and fill in each one. Always state the plugin version, the Obsidian version and your operating system.

## License

© [mnaoumov](https://github.com/mnaoumov/)
