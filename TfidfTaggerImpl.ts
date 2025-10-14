import { TFile, Notice } from 'obsidian';
// REMOVED: import { TfIdf } from 'natural';
import TfidfTagger from './main';
// --- NEW IMPORT for the custom implementation ---
import { TfIdfCore } from './TfIdfCore';

export class TfidfTaggerImpl {
	plugin: TfidfTagger;
	tfidfCore: TfIdfCore; // Renamed property to reflect the new class
	filePaths: string[];

	constructor(plugin: TfidfTagger) {
		this.plugin = plugin;
		this.tfidfCore = new TfIdfCore(); // Initialize new core
		this.filePaths = [];
	}

	async rebuildCortex(silent = false) {
		if (!silent) {
			new Notice('Gathering all the pebbles, this might take a moment...');
		}
		this.tfidfCore = new TfIdfCore(); // Re-initialize the core
		this.filePaths = [];
		const files = await this.plugin.getCortexFiles();
		const stopWords = this.plugin.settings.stopWords.split(',').map(sw => sw.trim());

		for (const file of files) {
			const content = await this.plugin.readFile(file);
			this.tfidfCore.addDocument(content, stopWords); // Use new method
			this.filePaths.push(file.path);
		}

		if (!silent) {
			new Notice("I've learned from all the pebbles!");
		}
	}

	async tagNote(file: TFile) {
		// Use the utility method to check if corpus is empty
		if (this.tfidfCore.isCorpusEmpty()) {
			new Notice('My pebble collection is empty! Please rebuild it in the settings.');
			return;
		}

		const content = await this.plugin.readFile(file);
		const docIndex = this.filePaths.indexOf(file.path);

		let terms: { term: string; tfidf: number }[] = [];

		if (docIndex !== -1) {
			// Case 1: Document is already in the corpus (preferred for accuracy)
			terms = this.tfidfCore.getDocumentScores(docIndex);

		} else {
			// Case 2: Document is new or not tracked. Score it against the corpus.
			const stopWords = this.plugin.settings.stopWords.split(',').map(sw => sw.trim());
			const termCounts = this.tfidfCore.getTermsAndCounts(content, stopWords);
			const totalTerms = Array.from(termCounts.values()).reduce((a, b) => a + b, 0);

			for (const term of termCounts.keys()) {
				// Calculate TF using the new document's counts
				const termCount = termCounts.get(term) || 0;
				const tf = totalTerms > 0 ? termCount / totalTerms : 0;

				// Calculate IDF using the main corpus's statistics
				const idf = this.tfidfCore.idf(term);

				terms.push({ term: term, tfidf: tf * idf });
			}
			// NOTE: The problematic line 'this.tfidf.addDocument(content);' is removed here.
		}

		const tags = terms
			.sort((a, b) => b.tfidf - a.tfidf)
			.slice(0, this.plugin.settings.numTags)
			.map(term => term.term)
			.filter(tag => !tag.match(/^\d+$/)); // Filter out numbers

		await this.plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
			const existingTags = frontmatter.tags || [];
			const newTags = [...new Set([...existingTags, ...tags])];
			frontmatter.tags = newTags;
		});
	}

	async tagAllNotes() {
		// Use the utility method to check if corpus is empty
		if (this.tfidfCore.isCorpusEmpty()) {
			new Notice('My pebble collection is empty! Please rebuild it in the settings.');
			return;
		}

		new Notice('Happily tagging all your pebbles... This might take a while.');
		const files = this.plugin.app.vault.getMarkdownFiles();
		for (const file of files) {
			await this.tagNote(file);
		}
		new Notice('All pebbles are now beautifully tagged!');
	}
}
