# Contributing to Anotter Tagger

Thanks for your interest in contributing! Here are some guidelines to help you get started.

## Getting Started

1. Fork the repository and clone your fork.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development build (watch mode):
   ```bash
   npm run dev
   ```
4. Copy or symlink the plugin folder into your test vault's `.obsidian/plugins/tf-idf-tagger/` directory.
5. Reload Obsidian and enable the plugin.

## Development

- Source code lives in `src/`.
- The plugin uses esbuild to bundle everything into `main.js`.
- Run `npm run build` for a production build.
- Run `npm run dev` for a watch-mode development build.

## Project Structure

```
src/
  main.ts              # Plugin entry point and lifecycle
  settings.ts          # Settings interface and defaults
  core/
    TagManager.ts      # Orchestrates tag generation across providers
    Types.ts           # Shared TypeScript interfaces
  providers/
    ollama/            # Ollama AI provider
    tfidf/             # TF-IDF provider
  ui/
    SettingTab.ts      # Settings panel UI
  utils/
    vault-utils.ts     # Shared utility functions
```

## Adding a New Provider

See the [Developer Guide](docs/DEVELOPER_GUIDE.md) for detailed instructions on adding new tagging providers.

## Submitting Changes

1. Create a feature branch from `master`.
2. Make your changes with clear, descriptive commit messages.
3. Ensure the project builds without errors: `npm run build`.
4. Open a pull request against `master` with a description of your changes.

## Reporting Bugs

Please open a [GitHub issue](https://github.com/blackwolf244/anotter_tagger/issues) with:
- A clear description of the bug.
- Steps to reproduce it.
- Your Obsidian version and OS.

## Code Style

- TypeScript with strict mode enabled.
- Use `async/await` over promise chains.
- Keep files focused on a single responsibility.
- Follow existing patterns in the codebase.
