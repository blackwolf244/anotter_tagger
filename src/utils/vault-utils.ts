import { App } from 'obsidian';

/**
 * Returns all tags currently used in the vault as a record of tag -> count.
 * Centralises the unsafe cast of metadataCache so it only appears once.
 */
export function getVaultTags(app: App): Record<string, number> {
	return (app.metadataCache as any).getTags?.() ?? {};
}
