import { App, Plugin, TFile, TFolder, Notice } from 'obsidian';
import { TfidfTaggerSettings, DEFAULT_SETTINGS, TfidfTaggerSettingTab } from './settings';
import { TfidfTaggerImpl } from './TfidfTaggerImpl';
import stopwordsJson from './stopwords-iso.json';
// stopwords-iso.json has the shape { [lang: string]: string[] }
interface StopwordsMap {
	[lang: string]: string[];
}
const stopwords: StopwordsMap = stopwordsJson as unknown as StopwordsMap;

export default class TfidfTagger extends Plugin {
	settings: TfidfTaggerSettings;
	tagger: TfidfTaggerImpl;
	private debounceTimer: NodeJS.Timeout;

	async onload() {
		await this.loadSettings();
		this.updateStopWords();

		this.tagger = new TfidfTaggerImpl(this);

		this.rebuildCortex();

		this.addSettingTab(new TfidfTaggerSettingTab(this.app, this));

		this.addCommand({
			id: 'rebuild-cortex',
			name: 'Rebuild Cortex',
			callback: async () => {
				new Notice('🦦 Gathering all the pebbles, this might take a moment...');
				await this.tagger.rebuildCortex();
			},
		});

		this.addCommand({
			id: 'tag-all-notes',
			name: 'Tag All Notes',
			callback: async () => {
				new Notice("🦦 All done! I’ve learned from all the pebbles!");
				await this.tagger.tagAllNotes();
			},
		});

		this.addCommand({
			id: 'tag-active-note',
			name: 'Tag Active Note',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					new Notice("🦦 Tagging this note for you!");
					await this.tagger.tagNote(activeFile);
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
								this.tagger.tagNote(file);
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
						this.tagger.tagNote(file);
					}, 1000);
				}
			})
		);
	}

	async getCortexFiles(): Promise<TFile[]> {
		let files: TFile[] = [];
		if (this.settings.cortexSource === 'vault') {
			files = this.app.vault.getFiles().filter(file => file.extension === 'md' || file.extension === 'txt');
		} else {
			const folder = this.app.vault.getAbstractFileByPath(this.settings.cortexFolderPath);
			if (folder instanceof TFolder) {
				files = folder.children.filter(
					(file) => file instanceof TFile && (file.extension === 'md' || file.extension === 'txt')
				) as TFile[];
			}
		}
		return files;
	}

	async readFile(file: TFile): Promise<string> {
		if (file.extension === 'md' || file.extension === 'txt') {
			return this.app.vault.read(file);
		} else {
			return '';
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateStopWords();
		this.rebuildCortex(true);
	}

	updateStopWords() {
		// Support multiple languages for stopwords
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
		// Merge and dedupe
		const stopWords = Array.from(new Set([...isoStopWords, ...customStopWords]));
		this.settings.stopWords = stopWords.join(',');
	}

	rebuildCortex(silent = false) {
		this.tagger.rebuildCortex(silent);
	}

	tagAllNotes() {
		this.tagger.tagAllNotes();
	}
}
