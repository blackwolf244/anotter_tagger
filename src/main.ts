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

export default class AnotterTagger extends Plugin {
	settings!: TfidfTaggerSettings;
	tagManager!: TagManager;
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;

	async onload() {
		await this.loadSettings();
		this.updateStopWords();

		this.tagManager = new TagManager(this.app);

		this.registerProviders();

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
					new Notice("Tagging this note for you!");
					await this.tagManager.tagNote(activeFile, {
						primaryProviderId: this.settings.primaryProvider,
						secondaryProviderId: this.settings.secondaryProvider,
						providerLogging: this.settings.providerLogging
					});
				} else {
					new Notice("Please select a note to tag!");
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
					if (this.debounceTimer !== null) {
						clearTimeout(this.debounceTimer);
					}
					this.debounceTimer = setTimeout(() => {
						this.debounceTimer = null;
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

	onunload() {
		if (this.debounceTimer !== null) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
	}

	/**
	 * Creates and registers all tag providers with the TagManager.
	 * Provider instances hold a reference to this.settings so they
	 * always read current values without needing to be recreated.
	 */
	private registerProviders() {
		const ollamaProvider = new OllamaProvider(this.app, this.settings);
		const tfidfProvider = new TfidfProvider(this.app, this.settings);

		this.tagManager.registerProvider(ollamaProvider);
		this.tagManager.registerProvider(tfidfProvider);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// One-time migration: convert old ollamaEnabled boolean to new provider system
		if (this.settings.ollamaEnabled && this.settings.primaryProvider === 'tfidf') {
			this.settings.primaryProvider = 'ollama';
			this.settings.secondaryProvider = 'tfidf';
			this.settings.ollamaEnabled = false;
			await this.saveData(this.settings);
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateStopWords();
		// Providers hold a reference to this.settings, so they pick up
		// changes automatically. We just need to rebuild the TF-IDF index
		// since stopwords or scope may have changed.
		this.rebuildCortex(true);
	}

	updateStopWords() {
		const langs = (this.settings.languages || 'en')
			.split(',')
			.map(l => l.trim().toLowerCase())
			.filter(Boolean);
		const isoStopWords: string[] = [];
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
