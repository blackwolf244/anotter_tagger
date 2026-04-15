/**
 * OllamaProvider.ts
 * Tag generation logic using a local Ollama server.
 */
import { TFile, App } from 'obsidian';
import { TaggerProvider } from '../../core/Types';
import { generate, isReachable } from './OllamaClient';
import { getVaultTags } from '../../utils/vault-utils';
import { TfidfTaggerSettings } from '../../settings';

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

export class OllamaProvider implements TaggerProvider {
	id = 'ollama';
	name = 'Ollama (LLM)';

	async isAvailable(): Promise<boolean> {
		return await isReachable(this.settings.ollamaServerUrl);
	}

	constructor(
		private app: App,
		private settings: TfidfTaggerSettings
	) { }

	async generateTags(file: TFile): Promise<string[] | null> {
		const content = await this.app.vault.read(file);
		if (!content) return null;

		const existingTags = this.getExistingVaultTags();
		const prompt = this.buildPrompt(content, existingTags);

		const { ollamaServerUrl, ollamaModel, ollamaTemperature } = this.settings;
		const raw = await generate(ollamaServerUrl, ollamaModel, prompt, ollamaTemperature);
		if (!raw) return null;

		return this.parseResponse(raw);
	}

	private getExistingVaultTags(): string[] {
		const tagsWithCounts = getVaultTags(this.app);
		return Object.keys(tagsWithCounts).map(t => t.replace(/^#/, '').toLowerCase());
	}

	private buildPrompt(noteContent: string, existingTags: string[]): string {
		const numTags = this.settings.numTags;
		const truncated = noteContent.length > MAX_CONTENT_LENGTH
			? noteContent.slice(0, MAX_CONTENT_LENGTH) + '\n[...truncated]'
			: noteContent;

		const template = this.settings.ollamaCustomPrompt || DEFAULT_SYSTEM_PROMPT;

		return template
			.replace('{numTags}', String(numTags))
			.replace('{existingTags}', existingTags.join(', ') || '(none)')
			.replace('{noteContent}', truncated);
	}

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
		const numTags = this.settings.numTags;
		return tags
			.filter((t): t is string => typeof t === 'string')
			.map(t => t.toLowerCase().trim().replace(/^#/, ''))
			.filter(t => t.length > 0 && !/^\d+$/.test(t))
			.slice(0, numTags);
	}
}
