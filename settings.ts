import { App, PluginSettingTab, Setting } from 'obsidian';
import TfidfTagger from './main';
import { fetchModels } from './OllamaClient';

export interface TfidfTaggerSettings {
	cortexSource: 'vault' | 'folder';
	cortexFolderPath: string;
	numTags: number;
	useIsoStopWords: boolean;
	customStopWords: string;
	stopWords: string;
	languages: string; // Comma-separated ISO language codes for stopwords
	automaticTagging: boolean;
	prioritizeExistingTags: boolean;
	existingTagPriority: number;
	// Ollama provider settings
	ollamaEnabled: boolean;
	ollamaServerUrl: string;
	ollamaModel: string;
	ollamaTemperature: number;
	ollamaCustomPrompt: string;
}

export const DEFAULT_SETTINGS: TfidfTaggerSettings = {
	cortexSource: 'vault',
	cortexFolderPath: '',
	numTags: 5,
	useIsoStopWords: true,
	customStopWords: '',
	stopWords: "a,able,about,across,after,all,almost,also,am,among,an,and,any,are,as,at,be,because,been,but,by,can,cannot,could,dear,did,do,does,either,else,ever,every,for,from,get,got,had,has,have,he,her,hers,him,his,how,however,i,if,in,into,is,it,its,just,least,let,like,likely,may,me,might,most,must,my,neither,no,nor,not,of,off,often,on,only,or,other,our,own,rather,said,say,says,she,should,since,so,some,than,that,the,their,them,then,there,these,they,this,tis,to,too,twas,us,wants,was,we,were,what,when,where,which,while,who,whom,why,will,with,would,yet,you,your",
	languages: 'en,de,fr', // Default to English
	automaticTagging: true,
	prioritizeExistingTags: true,
	existingTagPriority: 5,
	// Ollama defaults
	ollamaEnabled: false,
	ollamaServerUrl: 'http://localhost:11434',
	ollamaModel: '',
	ollamaTemperature: 0.3,
	ollamaCustomPrompt: '',
};

export class TfidfTaggerSettingTab extends PluginSettingTab {
	plugin: TfidfTagger;

	constructor(app: App, plugin: TfidfTagger) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();


		containerEl.createEl('h2', { text: '🦦 Anotter Tagger Settings' });

		// Otter quotes
		const otterQuotes = [
			"You're otterly amazing!",
			"Let's make a significant otterence in your workflow.",
			"This plugin is my significant otter.",
			"Just another day at the otter office.",
			"Keep calm and otter on."
		];
		const randomQuote = otterQuotes[Math.floor(Math.random() * otterQuotes.length)];
		containerEl.createEl('div', { text: `"${randomQuote}"`, cls: 'otter-quote' });

		new Setting(containerEl)
			.setName('Prioritize Existing Tags')
			.setDesc('Should I give more weight to tags that already exist in your vault?')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.prioritizeExistingTags)
				.onChange(async (value) => {
					this.plugin.settings.prioritizeExistingTags = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Existing Tag Priority')
			.setDesc('How much more weight should I give to existing tags? (1 = no boost, 5 = default boost)')
			.addText(text => text
				.setPlaceholder('Enter the priority')
				.setValue(this.plugin.settings.existingTagPriority.toString())
				.onChange(async (value) => {
					this.plugin.settings.existingTagPriority = parseInt(value, 10);
					await this.plugin.saveSettings();
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
			.setName('Use ISO Stop Words')
			.setDesc('Words to ignore when I look for the interesting bits!')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useIsoStopWords)
				.onChange(async (value) => {
					this.plugin.settings.useIsoStopWords = value;
					await this.plugin.saveSettings();
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
			.setDesc("How many tags should I fetch for you?")
			.addText(text => text
				.setPlaceholder('Enter the number of tags')
				.setValue(this.plugin.settings.numTags.toString())
				.onChange(async (value) => {
					this.plugin.settings.numTags = parseInt(value, 10);
					await this.plugin.saveSettings();
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
			.setDesc('I can read .md and .txt files. If i should focus on a specific folder, just let me know!')
			.addDropdown(dropdown => dropdown
				.addOption('vault', 'Entire Vault')
				.addOption('folder', 'Specific Folder')
				.setValue(this.plugin.settings.cortexSource)
				.onChange(async (value: 'vault' | 'folder') => {
					this.plugin.settings.cortexSource = value;
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

		new Setting(containerEl)
			.setName('Enable Ollama')
			.setDesc('Use Ollama as the primary tag provider (falls back to TF-IDF on failure).')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.ollamaEnabled)
				.onChange(async (value) => {
					this.plugin.settings.ollamaEnabled = value;
					await this.plugin.saveSettings();
					this.display(); // re-render to show/hide Ollama settings
				}));

		if (this.plugin.settings.ollamaEnabled) {
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

		// ---- Actions section ----
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
	}
}
