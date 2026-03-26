import { Plugin, TFile, Notice } from 'obsidian';
import { TfidfTaggerSettings, DEFAULT_SETTINGS } from './settings';
import { TfidfTaggerSettingTab } from './ui/SettingTab';
import { TagManager } from './core/TagManager';
import { OllamaProvider } from './providers/ollama/OllamaProvider';
import { TfidfProvider } from './providers/tfidf/TfidfProvider';
import stopwordsJson from '../stopwords-iso.json';

interface StopwordsMap {
	[lang: string]: string[];
}
const stopwords: StopwordsMap = stopwordsJson as unknown as StopwordsMap;

export default class TfidfTagger extends Plugin {
	settings: TfidfTaggerSettings;
	tagManager: TagManager;
	private debounceTimer: NodeJS.Timeout;

	async onload() {
		await this.loadSettings();
		this.updateStopWords();

		this.tagManager = new TagManager(this.app);

		// Register providers
		const ollamaProvider = new OllamaProvider(this.app, {
			ollamaServerUrl: this.settings.ollamaServerUrl,
			ollamaModel: this.settings.ollamaModel,
			ollamaTemperature: this.settings.ollamaTemperature,
			ollamaCustomPrompt: this.settings.ollamaCustomPrompt,
			numTags: this.settings.numTags
		});

		const tfidfProvider = new TfidfProvider(this.app, {
			stopWords: this.settings.stopWords,
			numTags: this.settings.numTags,
			prioritizeExistingTags: this.settings.prioritizeExistingTags,
			existingTagPriority: this.settings.existingTagPriority,
			includeFolders: this.settings.cortexSource === 'folder' ? this.settings.cortexFolderPath : '',
			excludeFolders: ''
		});

		this.tagManager.registerProvider(ollamaProvider);
		this.tagManager.registerProvider(tfidfProvider);

		this.addSettingTab(new TfidfTaggerSettingTab(this.app, this));

		this.addCommand({
			id: 'rebuild-cortex',
			name: 'Rebuild Cortex',
			callback: async () => {
				await this.rebuildCortex();
			},
		});

		this.addCommand({
			id: 'tag-all-notes',
			name: 'Tag All Notes',
			callback: async () => {
				await this.tagAllNotes();
			},
		});

		this.addCommand({
			id: 'tag-active-note',
			name: 'Tag Active Note',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					new Notice("🦦 Tagging this note for you!");
					await this.tagManager.tagNote(activeFile, {
						primaryProviderId: this.settings.primaryProvider,
						secondaryProviderId: this.settings.secondaryProvider,
						providerLogging: this.settings.providerLogging
					});
				} else {
					new Notice("🦦 Please select a note to tag!");
				}
			},
		});

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (file instanceof TFile) {
					menu.addItem((item) => {
						item
							.setTitle('Tag Note')
							.setIcon('tag')
							.onClick(() => {
								this.tagManager.tagNote(file, {
									primaryProviderId: this.settings.primaryProvider,
									secondaryProviderId: this.settings.secondaryProvider,
									providerLogging: this.settings.providerLogging
								});
							});
					});
				}
			})
		);

		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (this.settings.automaticTagging && file instanceof TFile) {
					clearTimeout(this.debounceTimer);
					this.debounceTimer = setTimeout(() => {
						this.tagManager.tagNote(file, {
							primaryProviderId: this.settings.primaryProvider,
							secondaryProviderId: this.settings.secondaryProvider,
							providerLogging: this.settings.providerLogging
						});
					}, 1000);
				}
			})
		);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		// Migrate old settings if necessary
		if (this.settings.ollamaEnabled && this.settings.primaryProvider === 'tfidf') {
			this.settings.primaryProvider = 'ollama';
			this.settings.secondaryProvider = 'tfidf';
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateStopWords();
		// Update provider settings (they hold references to settings parts or we need to recreate them)
		// For simplicity, let's just re-initialize providers or update their settings if they were references.
		// Since I passed objects, I should probably just update those objects or re-run setup.
		this.rebuildCortex(true);
	}

	updateStopWords() {
		const langs = (this.settings.languages || 'en')
			.split(',')
			.map(l => l.trim().toLowerCase())
			.filter(Boolean);
		let isoStopWords: string[] = [];
		if (this.settings.useIsoStopWords) {
			for (const lang of langs) {
				const words = stopwords[lang] || [];
				isoStopWords.push(...words.map(sw => sw.trim().toLowerCase()));
			}
		}
		const customStopWords = this.settings.customStopWords
			.split(',')
			.map(sw => sw.trim().toLowerCase())
			.filter(Boolean);
		const stopWords = Array.from(new Set([...isoStopWords, ...customStopWords]));
		this.settings.stopWords = stopWords.join(',');
	}

	async rebuildCortex(silent = false) {
		const tfidf = this.tagManager.getProvider('tfidf') as TfidfProvider;
		if (tfidf) {
			await tfidf.rebuild(silent);
		}
	}

	async tagAllNotes() {
		await this.tagManager.tagAllNotes({
			primaryProviderId: this.settings.primaryProvider,
			secondaryProviderId: this.settings.secondaryProvider,
			providerLogging: this.settings.providerLogging
		});
	}
}
