/**
 * OllamaTaggerImpl.ts
 * Tag generation logic using a local Ollama server. Builds a prompt that
 * includes note content and existing vault tags, then parses the LLM
 * response into a tag list.
 */
import { TFile, Notice } from 'obsidian';
import TfidfTagger from './main';
import { generate } from './OllamaClient';

const DEFAULT_SYSTEM_PROMPT =
	`You are a note tagging assistant. Given the following note content and a list of ` +
	`existing tags used in the vault, suggest exactly {numTags} relevant tags for this note.\n\n` +
	`Prefer reusing existing tags when they are relevant. Tags should be single words or ` +
	`hyphenated-phrases, lowercase, without the # symbol.\n\n` +
	`Existing vault tags: {existingTags}\n\n` +
	`Note content:\n---\n{noteContent}\n---\n\n` +
	`Respond with ONLY a JSON array of tag strings, nothing else. Example: ["tag1", "tag2", "tag3"]`;

/** Maximum characters of note content sent in the prompt. */
const MAX_CONTENT_LENGTH = 4000;

export class OllamaTaggerImpl {
	plugin: TfidfTagger;

	constructor(plugin: TfidfTagger) {
		this.plugin = plugin;
	}

	/**
	 * Generate tags for a single note via Ollama.
	 * Returns the tag array on success, or null when the generation fails
	 * or the response cannot be parsed.
	 */
	async tagNote(file: TFile): Promise<string[] | null> {
		const content = await this.plugin.readFile(file);
		if (!content) return null;

		const existingTags = this.getExistingVaultTags();
		const prompt = this.buildPrompt(content, existingTags);

		const { ollamaServerUrl, ollamaModel, ollamaTemperature } = this.plugin.settings;
		const raw = await generate(ollamaServerUrl, ollamaModel, prompt, ollamaTemperature);
		if (!raw) return null;

		return this.parseResponse(raw);
	}

	/**
	 * Tag every file in the provided array, writing results to frontmatter.
	 * Includes a small sequential delay to avoid hammering the server.
	 */
	async tagAllNotes(files: TFile[]): Promise<void> {
		for (const file of files) {
			const tags = await this.tagNote(file);
			if (tags && tags.length > 0) {
				await this.writeTags(file, tags);
			}
			// Small delay between calls to be gentle on the Ollama server
			await this.sleep(200);
		}
	}

	// ---- private helpers ------------------------------------------------

	private getExistingVaultTags(): string[] {
		const tagsWithCounts: Record<string, number> =
			(this.plugin.app.metadataCache as any).getTags() ?? {};
		return Object.keys(tagsWithCounts).map(t => t.replace(/^#/, '').toLowerCase());
	}

	private buildPrompt(noteContent: string, existingTags: string[]): string {
		const numTags = this.plugin.settings.numTags;
		const truncated = noteContent.length > MAX_CONTENT_LENGTH
			? noteContent.slice(0, MAX_CONTENT_LENGTH) + '\n[...truncated]'
			: noteContent;

		const template = this.plugin.settings.ollamaCustomPrompt || DEFAULT_SYSTEM_PROMPT;

		return template
			.replace('{numTags}', String(numTags))
			.replace('{existingTags}', existingTags.join(', ') || '(none)')
			.replace('{noteContent}', truncated);
	}

	/**
	 * Defensively parse the LLM response into a tag array.
	 * Handles markdown code fences, trailing commas, and other quirks.
	 */
	private parseResponse(raw: string): string[] | null {
		let text = raw.trim();

		// Strip markdown code fences if present
		text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
		text = text.trim();

		// Try direct JSON parse first
		try {
			const parsed = JSON.parse(text);
			if (Array.isArray(parsed)) {
				return this.sanitizeTags(parsed);
			}
		} catch {
			// fall through to regex extraction
		}

		// Try to extract a JSON array via regex
		const match = text.match(/\[[\s\S]*?\]/);
		if (match) {
			try {
				// Remove trailing commas before closing bracket
				const cleaned = match[0].replace(/,\s*]/g, ']');
				const parsed = JSON.parse(cleaned);
				if (Array.isArray(parsed)) {
					return this.sanitizeTags(parsed);
				}
			} catch {
				// give up
			}
		}

		return null;
	}

	private sanitizeTags(tags: unknown[]): string[] {
		const numTags = this.plugin.settings.numTags;
		return tags
			.filter((t): t is string => typeof t === 'string')
			.map(t => t.toLowerCase().trim().replace(/^#/, ''))
			.filter(t => t.length > 0 && !/^\d+$/.test(t))
			.slice(0, numTags);
	}

	async writeTags(file: TFile, tags: string[]): Promise<void> {
		await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
			const existing: string[] = fm.tags || [];
			fm.tags = [...new Set([...existing, ...tags])];
		});
	}

	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}
