/**
 * TfidfProvider.ts
 * Tag generation logic using TF-IDF algorithm.
 */
import { TFile, App, Notice } from 'obsidian';
import { TaggerProvider } from '../../core/Types';
import { TfIdfCore } from './TfIdfCore';

export interface TfidfSettings {
	stopWords: string;
	numTags: number;
	prioritizeExistingTags: boolean;
	existingTagPriority: number;
	includeFolders: string;
	excludeFolders: string;
}

export class TfidfProvider implements TaggerProvider {
	id = 'tfidf';
	name = 'TF-IDF (Local)';
	private tfidfCore: TfIdfCore;
	private filePaths: string[] = [];

	async isAvailable(): Promise<boolean> {
		return true;
	}

	constructor(
		private app: App,
		private settings: TfidfSettings
	) {
		this.tfidfCore = new TfIdfCore();
	}

	async generateTags(file: TFile): Promise<string[] | null> {
		if (this.tfidfCore.isCorpusEmpty()) {
			await this.rebuild(true);
			if (this.tfidfCore.isCorpusEmpty()) {
				return null;
			}
		}

		const content = await this.app.vault.read(file);
		const docIndex = this.filePaths.indexOf(file.path);

		let terms: { term: string; tfidf: number }[] = [];

		if (docIndex !== -1) {
			terms = this.tfidfCore.getDocumentScores(docIndex);
		} else {
			const stopWords = this.settings.stopWords.split(',').map(sw => sw.trim());
			const termCounts = this.tfidfCore.getTermsAndCounts(content, stopWords);
			const totalTerms = Array.from(termCounts.values()).reduce((a, b) => a + b, 0);

			for (const term of termCounts.keys()) {
				const termCount = termCounts.get(term) || 0;
				const tf = totalTerms > 0 ? termCount / totalTerms : 0;
				const idf = this.tfidfCore.idf(term);
				terms.push({ term, tfidf: tf * idf });
			}
		}

		if (this.settings.prioritizeExistingTags) {
			const existingTagsWithCounts: Record<string, number> = (this.app.metadataCache as any).getTags() ?? {};
			const existingTags = Object.keys(existingTagsWithCounts).map(tag => tag.replace(/^#/, ''));

			terms.forEach(term => {
				if (existingTags.includes(term.term)) {
					term.tfidf *= this.settings.existingTagPriority;
				}
			});
		}

		return terms
			.sort((a, b) => b.tfidf - a.tfidf)
			.slice(0, this.settings.numTags)
			.map(term => term.term)
			.filter(tag => !tag.match(/^\d+$/));
	}

	async rebuild(silent = false): Promise<void> {
		if (!silent) {
			new Notice('Gathering all the pebbles, this might take a moment...');
		}
		this.tfidfCore = new TfIdfCore();
		this.filePaths = [];
		const files = await this.getCortexFiles();
		const stopWords = this.settings.stopWords.split(',').map(sw => sw.trim());

		for (const file of files) {
			const content = await this.app.vault.read(file);
			this.tfidfCore.addDocument(content, stopWords);
			this.filePaths.push(file.path);
		}

		if (!silent) {
			new Notice("I've learned from all the pebbles!");
		}
	}

	private async getCortexFiles(): Promise<TFile[]> {
		const files = this.app.vault.getMarkdownFiles();
		const includeFolders = this.settings.includeFolders.split(',').map(f => f.trim()).filter(f => f !== "");
		const excludeFolders = this.settings.excludeFolders.split(',').map(f => f.trim()).filter(f => f !== "");

		return files.filter(file => {
			const path = file.path;
			const isIncluded = includeFolders.length === 0 || includeFolders.some(folder => path.startsWith(folder));
			const isExcluded = excludeFolders.some(folder => path.startsWith(folder));
			return isIncluded && !isExcluded;
		});
	}
}
