import { App, PluginSettingTab, Setting } from 'obsidian';
import AnotterTagger from '../main';
import { fetchModels } from '../providers/ollama/OllamaClient';

export class TfidfTaggerSettingTab extends PluginSettingTab {
	plugin: AnotterTagger;

	constructor(app: App, plugin: AnotterTagger) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// Otter quotes
		const otterQuotes = [
			"You're otterly amazing!",
			"Let's make a significant otterence in your workflow.",
			"This plugin is my significant otter.",
			"Just another day at the otter office.",
			"Keep calm and otter on."
		];
		const randomQuote = otterQuotes[Math.floor(Math.random() * otterQuotes.length)];
		containerEl.createEl('h1', { text: `"${randomQuote}"`, cls: 'otter-quote' });

		// ---- Actions section ----
		containerEl.createEl('h2', { text: 'Actions' });
		containerEl.createEl('p', {
			text: 'Use those actions whenever you want to refresh my memory or do some big changes to your vault. I will silently update my index (the cortex) in the background, so you can keep working while I do my thing.',
			cls: 'setting-item-description',
		});

		new Setting(containerEl)
			.setName('Rebuild Pebble Collection')
			.setDesc("Click here to have me re-organize my pebble collection (the index). It might take a moment!")
			.addButton(button => button
				.setButtonText('Rebuild')
				.onClick(() => {
					this.plugin.rebuildCortex();
				}));

		new Setting(containerEl)
			.setName('Tag All Pebbles')
			.setDesc("Only click me if you really want me to tag every single one of your notes! It might take a while...")
			.addButton(button => button
				.setButtonText('Apply and Update')
				.onClick(() => {
					this.plugin.tagAllNotes();
				}));

		// ---- Tagging options section ----
		containerEl.createEl('h2', { text: 'Tagging Options' });
		containerEl.createEl('p', {
			text: 'These settings control how I generate tags for your notes.',
			cls: 'setting-item-description',
		});

		new Setting(containerEl)
			.setName('Primary Provider')
			.setDesc('Which provider should I try first?')
			.addDropdown(dropdown => dropdown
				.addOption('tfidf', 'TF-IDF (Local)')
				.addOption('ollama', 'Ollama (LLM)')
				.setValue(this.plugin.settings.primaryProvider)
				.onChange(async (value) => {
					this.plugin.settings.primaryProvider = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName('Secondary Provider')
			.setDesc('Which provider should I use if the primary one is not available?')
			.addDropdown(dropdown => dropdown
				.addOption('none', 'None')
				.addOption('tfidf', 'TF-IDF (Local)')
				.addOption('ollama', 'Ollama (LLM)')
				.setValue(this.plugin.settings.secondaryProvider)
				.onChange(async (value) => {
					this.plugin.settings.secondaryProvider = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName('Automatic Tagging')
			.setDesc('Should I automatically tag notes on save?')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.automaticTagging)
				.onChange(async (value) => {
					this.plugin.settings.automaticTagging = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Provider Logging')
			.setDesc('Log which provider was used and what tags it returned to the console (useful for debugging).')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.providerLogging)
				.onChange(async (value) => {
					this.plugin.settings.providerLogging = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Existing Tag Priority')
			.setDesc('How much more weight should I give to existing tags? (1 = no boost, 5 = default boost)')
			.addText(text => text
				.setPlaceholder('Enter the priority')
				.setValue(this.plugin.settings.existingTagPriority.toString())
				.onChange(async (value) => {
					const num = parseInt(value, 10);
					if (!isNaN(num) && num >= 1 && num <= 100) {
						this.plugin.settings.existingTagPriority = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Stopword Lists')
			.setDesc('Comma-separated ISO codes for stopword lists that I should use (e.g., en,de,fr)')
			.addText(text => text
				.setPlaceholder('en,de,fr')
				.setValue(this.plugin.settings.languages || 'en,de,fr')
				.onChange(async (value) => {
					this.plugin.settings.languages = value
						.split(',')
						.map(l => l.trim().toLowerCase())
						.filter(Boolean)
						.join(',');
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Number of Tags')
			.setDesc("How many tags should I fetch for you? (1-20)")
			.addText(text => text
				.setPlaceholder('Enter the number of tags')
				.setValue(this.plugin.settings.numTags.toString())
				.onChange(async (value) => {
					const num = parseInt(value, 10);
					if (!isNaN(num) && num >= 1 && num <= 20) {
						this.plugin.settings.numTags = num;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Custom Stop Words')
			.setDesc('A comma-separated list of words to ignore when tagging.')
			.addTextArea(text => text
				.setPlaceholder('Enter comma-separated stop words')
				.setValue(this.plugin.settings.customStopWords)
				.onChange(async (value) => {
					this.plugin.settings.customStopWords = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Reference Source')
			.setDesc('I can read .md and .txt files. If I should focus on a specific folder, just let me know!')
			.addDropdown(dropdown => dropdown
				.addOption('vault', 'Entire Vault')
				.addOption('folder', 'Specific Folder')
				.setValue(this.plugin.settings.cortexSource)
				.onChange(async (value: string) => {
					this.plugin.settings.cortexSource = value as 'vault' | 'folder';
					await this.plugin.saveSettings();
					this.display();
				}));

		if (this.plugin.settings.cortexSource === 'folder') {
			new Setting(containerEl)
				.setName('Index Folder Path')
				.setDesc('Point me to the cozy corner of your vault to search in.')
				.addText(text => text
					.setPlaceholder('Enter the folder path')
					.setValue(this.plugin.settings.cortexFolderPath)
					.onChange(async (value) => {
						this.plugin.settings.cortexFolderPath = value;
						await this.plugin.saveSettings();
					}));
		}

		// ---- Ollama AI Tagging section ----
		containerEl.createEl('h2', { text: 'Ollama AI tagging' });
		containerEl.createEl('p', {
			text: 'Use a local Ollama LLM to generate tags instead of TF-IDF. When enabled and reachable the LLM generates tags; otherwise I silently fall back to TF-IDF.',
			cls: 'setting-item-description',
		});

		if (this.plugin.settings.primaryProvider === 'ollama' || this.plugin.settings.secondaryProvider === 'ollama') {
			new Setting(containerEl)
				.setName('Server URL')
				.setDesc('Base URL of the Ollama server.')
				.addText(text => text
					.setPlaceholder('http://localhost:11434')
					.setValue(this.plugin.settings.ollamaServerUrl)
					.onChange(async (value) => {
						this.plugin.settings.ollamaServerUrl = value;
						await this.plugin.saveSettings();
					}));

			// Model dropdown -- populated dynamically
			const modelSetting = new Setting(containerEl)
				.setName('Model')
				.setDesc('Select which Ollama model to use for tagging.');

			modelSetting.addDropdown(async (dropdown) => {
				dropdown.addOption('', 'Loading models...');
				dropdown.setDisabled(true);

				const models = await fetchModels(this.plugin.settings.ollamaServerUrl);
				// Clear placeholder
				dropdown.selectEl.empty();

				if (models.length === 0) {
					dropdown.addOption('', 'Could not connect to Ollama');
					dropdown.setDisabled(true);
				} else {
					dropdown.setDisabled(false);
					for (const model of models) {
						dropdown.addOption(model, model);
					}
					if (this.plugin.settings.ollamaModel && models.includes(this.plugin.settings.ollamaModel)) {
						dropdown.setValue(this.plugin.settings.ollamaModel);
					} else if (models.length > 0) {
						dropdown.setValue(models[0]);
						this.plugin.settings.ollamaModel = models[0];
						await this.plugin.saveSettings();
					}
					dropdown.onChange(async (value) => {
						this.plugin.settings.ollamaModel = value;
						await this.plugin.saveSettings();
					});
				}
			});

			modelSetting.addButton(button => button
				.setButtonText('Refresh')
				.onClick(() => {
					this.display();
				}));

			new Setting(containerEl)
				.setName('Temperature')
				.setDesc('Controls randomness (0.0 = deterministic, 1.0 = creative). Default 0.3.')
				.addText(text => text
					.setPlaceholder('0.3')
					.setValue(this.plugin.settings.ollamaTemperature.toString())
					.onChange(async (value) => {
						const num = parseFloat(value);
						if (!isNaN(num) && num >= 0 && num <= 1) {
							this.plugin.settings.ollamaTemperature = num;
							await this.plugin.saveSettings();
						}
					}));

			new Setting(containerEl)
				.setName('Custom prompt')
				.setDesc('Override the default system prompt. Use {numTags}, {existingTags}, and {noteContent} as placeholders.')
				.addTextArea(text => text
					.setPlaceholder('Leave empty to use the default prompt')
					.setValue(this.plugin.settings.ollamaCustomPrompt)
					.onChange(async (value) => {
						this.plugin.settings.ollamaCustomPrompt = value;
						await this.plugin.saveSettings();
					}));
		}
	}
}
