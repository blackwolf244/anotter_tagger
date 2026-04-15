# Anotter Tagger

Anotter Tagger is an Obsidian plugin to automatically tag notes. It analyzes note content to suggest and apply relevant tags, helping to organize your knowledge base efficiently.

The plugin offers two tagging engines, TF-IDF and local AI via Ollama, to provide flexible and accurate tag generation.

## Installation

### From the Community Plugin Browser

1. Open **Settings -> Community plugins** in Obsidian.
2. Select **Browse** and search for **Anotter Tagger**.
3. Select **Install**, then **Enable**.

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/blackwolf244/anotter_tagger/releases/latest).
2. Create a folder called `tf-idf-tagger` inside your vault's `.obsidian/plugins/` directory.
3. Copy the downloaded files into that folder.
4. Reload Obsidian and enable the plugin in **Settings -> Community plugins**.

### Using BRAT (for Beta Testing)

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin.
2. In BRAT settings, select **Add Beta plugin** and enter `blackwolf244/anotter_tagger`.
3. Enable the plugin in **Settings -> Community plugins**.

## Features

- **Automatic Tagging**: Automatically applies tags when a note is saved.
- **Dual Tagging Engines**:
    - **TF-IDF**: A classic, fast, and reliable keyword-extraction method that works offline.
    - **Ollama AI**: Utilizes local Large Language Models (LLMs) via Ollama for intelligent, context-aware tagging.
- **Silent Fallback**: If Ollama is enabled but unavailable, the tagger seamlessly falls back to the built-in TF-IDF engine.
- **Configurable Scope**: Configure the tagger to learn from your entire vault or a specific folder.
- **Manual Control**: Tag individual notes on-demand via the file menu or command palette.
- **Multi-Language Support**: Improves tag quality by using stopword lists for multiple languages (defaults to English, German, and French).
- **Customizable**: Fine-tune everything from the number of tags to the AI's behavior.

## How It Works

Anotter Tagger uses two distinct methods to generate tags:

1.  **TF-IDF (Term Frequency-Inverse Document Frequency)**: The default method. The tagger builds a vocabulary from all notes within its configured scope. It then identifies words that are significant to a specific note but not overly common across all notes, making them ideal tag candidates.

2.  **Ollama AI Tagging**: If you have [Ollama](https://ollama.com/) running locally, you can enable this mode. The plugin sends the note content to your local LLM, which generates a list of relevant tags based on its contextual understanding of the text. This allows for more conceptual and nuanced tagging.

When Ollama is enabled, it is the primary provider. If it fails for any reason (e.g., the server is down), the plugin automatically and silently falls back to using the TF-IDF method for that request.

## Settings

The plugin's behavior can be configured through the settings panel.

### Core Actions

- **Rebuild Cortex**: Re-scans all notes to update the tagger's internal vocabulary.
- **Tag All Notes**: Applies tags to all notes in the vault based on the current settings.

### Tagging Options

- **Automatic Tagging**: Toggle whether notes are tagged automatically on save.
- **Existing Tag Priority**: Apply a weight to words that are already tags in your vault, increasing their likelihood of being chosen.
- **Stopword Lists**: Define which language stopword lists to use (e.g., `en,de,fr`). Stopwords are common words that are ignored to improve tag quality.
- **Number of Tags**: Set the maximum number of tags to generate for each note.
- **Custom Stop Words**: Provide a comma-separated list of additional words to ignore during tagging.
- **Reference Source**: Choose whether the tagger should learn from the **Entire Vault** or a **Specific Folder**.

### Ollama AI Tagging

- **Enable Ollama**: Use a local Ollama LLM as the primary tag provider.
- **Server URL**: The base URL of your Ollama server (e.g., `http://localhost:11434`).
- **Model**: Select which Ollama model to use for tagging.
- **Temperature**: Controls the creativity of the AI. Lower values (e.g., 0.2) are more deterministic, while higher values (e.g., 1.0) are more creative.
- **Custom prompt**: Override the default system prompt to fine-tune the AI's behavior. Use `{numTags}`, `{existingTags}`, and `{noteContent}` as placeholders.

## Commands

- **Rebuild Cortex**: Re-indexes the vocabulary from your notes.
- **Tag All Notes**: Iterates through and tags all notes in your vault.
- **Tag Active Note**: Tags the currently open note.
- You can also **right-click on a file** in the file explorer and select "Tag Note" from the context menu.

## Contributing

Contributions are welcome! Please see the [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the [MIT License](LICENSE).

---

Made with care by your significant otter.
