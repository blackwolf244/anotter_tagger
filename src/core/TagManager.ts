import { App, TFile, Notice } from 'obsidian';
import { TaggerProvider } from './Types';

export class TagManager {
	private providers: Map<string, TaggerProvider> = new Map();

	constructor(private app: App) { }

	registerProvider(provider: TaggerProvider) {
		this.providers.set(provider.id, provider);
	}

	getProvider(id: string): TaggerProvider | undefined {
		return this.providers.get(id);
	}

	/**
	 * Main flow: try first provider, then fallback if not available or fails.
	 */
	async tagNote(file: TFile, options: {
		primaryProviderId: string,
		secondaryProviderId?: string,
		providerLogging?: boolean
	}): Promise<boolean> {
		const { primaryProviderId, secondaryProviderId, providerLogging } = options;

		let tags: string[] | null = null;
		let providerUsed = '';

		const primary = this.providers.get(primaryProviderId);
		if (primary && await primary.isAvailable()) {
			try {
				tags = await primary.generateTags(file);
				providerUsed = primaryProviderId;
			} catch (e) {
				console.error(`Primary provider ${primaryProviderId} failed:`, e);
			}
		}

		if ((!tags || tags.length === 0) && secondaryProviderId && secondaryProviderId !== 'none') {
			const secondary = this.providers.get(secondaryProviderId);
			if (secondary && await secondary.isAvailable()) {
				try {
					tags = await secondary.generateTags(file);
					providerUsed = secondaryProviderId;
				} catch (e) {
					console.error(`Secondary provider ${secondaryProviderId} failed:`, e);
				}
			}
		}

		if (tags && tags.length > 0) {
			if (providerLogging) {
				console.log(`[Provider Logging] Provider: ${providerUsed}, Tags: ${tags.join(', ')}`);
			}
			await this.writeTags(file, tags);
			return true;
		} else {
			console.log(`Failed to generate any tags for ${file.path}. Providers used: ${primaryProviderId}, ${secondaryProviderId}`);
			// Only show notice if it's a manual action or something significant. 
			// For automatic tagging it might be annoying if it fails often.
			return false;
		}
	}

	async tagAllNotes(options: {
		primaryProviderId: string,
		secondaryProviderId?: string,
		providerLogging?: boolean
	}): Promise<void> {
		const files = this.app.vault.getMarkdownFiles();
		const total = files.length;

		if (total === 0) {
			new Notice('No markdown files found to tag.');
			return;
		}

		// Duration 0 = persistent until we hide it
		const progressNotice = new Notice('', 0);
		let success = 0;
		let failed = 0;

		try {
			for (let i = 0; i < files.length; i++) {
				progressNotice.setMessage(`Tagging notes: ${i + 1} / ${total}`);
				const tagged = await this.tagNote(files[i], options);
				if (tagged) {
					success++;
				} else {
					failed++;
				}
			}

			const summary = failed > 0
				? `Tagging complete: ${success} tagged, ${failed} failed out of ${total} notes`
				: `Tagging complete: ${success} notes tagged successfully!`;
			new Notice(summary);
		} finally {
			progressNotice.hide();
		}
	}

	private async writeTags(file: TFile, tags: string[]): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (fm) => {
			const existing: string[] = fm.tags || [];
			// Convert all to strings and handle potential non-array formats if they exist
			const existingArray = Array.isArray(existing) ? existing : [existing];
			fm.tags = [...new Set([...existingArray, ...tags])];
		});
	}
}
