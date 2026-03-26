/**
 * TfIdfCore.ts
 * * Contains the pure TypeScript implementation of the TF-IDF algorithm, 
 * independent of the Obsidian API.
 */

// Define a structure to hold term counts for a single document
type DocumentTermCounts = Map<string, number>;

// Define a structure to store the entire corpus (all documents)
interface Corpus {
	documents: DocumentTermCounts[];
	termDocumentCount: Map<string, number>; // How many documents contain a term
	totalDocuments: number;
}

export class TfIdfCore {
	private corpus: Corpus;

	constructor() {
		this.corpus = {
			documents: [],
			termDocumentCount: new Map(),
			totalDocuments: 0,
		};
	}

	// A very basic tokenizer: lowercases, removes punctuation, splits by space, filters terms < 3 chars
	private tokenize(text: string, stopWords: string[]): string[] {
		const stopWordsSet = new Set(stopWords);
		return text
			.toLowerCase()
			.replace(/[^\w\s]/g, '')
			.split(/\s+/)
			.filter(term => term.length > 2 && !stopWordsSet.has(term));
	}

	// Adds a document to the corpus for IDF calculation
	public addDocument(text: string, stopWords: string[] = []): void {
		const tokens = this.tokenize(text, stopWords);
		const termCounts: DocumentTermCounts = new Map();

		// 1. Calculate Term Frequency (raw counts)
		for (const term of tokens) {
			termCounts.set(term, (termCounts.get(term) || 0) + 1);
		}

		// 2. Add TF to the document list
		this.corpus.documents.push(termCounts);
		this.corpus.totalDocuments++;

		// 3. Update the overall Term Document Count (IDF component)
		for (const term of termCounts.keys()) {
			this.corpus.termDocumentCount.set(term, (this.corpus.termDocumentCount.get(term) || 0) + 1);
		}
	}

	// Calculates the Inverse Document Frequency (IDF) for a single term
	// Uses a smoothed formula to ensure non-zero weights
	public idf(term: string): number {
		const N = this.corpus.totalDocuments;
		const n_t = this.corpus.termDocumentCount.get(term) || 0;

		// Smoothed IDF: log((1 + N) / (1 + n_t)) + 1
		return Math.log((1 + N) / (1 + n_t)) + 1;
	}

	// Gets all unique terms and their TF-IDF scores for a document in the corpus
	public getDocumentScores(docIndex: number): { term: string; tfidf: number }[] {
		const documentCounts = this.corpus.documents[docIndex];
		if (!documentCounts) return [];

		const totalTerms = Array.from(documentCounts.values()).reduce((a, b) => a + b, 0);

		const scores: { term: string; tfidf: number }[] = [];

		for (const term of documentCounts.keys()) {
			const termCount = documentCounts.get(term) || 0;
			const tf = totalTerms > 0 ? termCount / totalTerms : 0;
			const idf = this.idf(term);

			scores.push({ term, tfidf: tf * idf });
		}

		return scores;
	}

	// Utility to get the tokenized terms and their raw counts for a new, non-corpus document
	public getTermsAndCounts(text: string, stopWords: string[] = []): DocumentTermCounts {
		const tokens = this.tokenize(text, stopWords);
		const termCounts: DocumentTermCounts = new Map();
		for (const term of tokens) {
			termCounts.set(term, (termCounts.get(term) || 0) + 1);
		}
		return termCounts;
	}

	// Utility to check if the corpus is empty
	public isCorpusEmpty(): boolean {
		return this.corpus.totalDocuments === 0;
	}
}
