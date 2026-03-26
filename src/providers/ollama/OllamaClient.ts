/**
 * OllamaClient.ts
 * Thin HTTP wrapper around the Ollama REST API using Obsidian's built-in
 * requestUrl so no external dependencies are needed.
 */
import { requestUrl } from 'obsidian';

interface OllamaModel {
	name: string;
	modified_at: string;
	size: number;
}

interface OllamaTagsResponse {
	models: OllamaModel[];
}

interface OllamaGenerateResponse {
	response: string;
}

/**
 * Fetch the list of available model names from an Ollama server.
 * Returns an empty array on any failure.
 */
export async function fetchModels(serverUrl: string): Promise<string[]> {
	try {
		const url = `${serverUrl.replace(/\/+$/, '')}/api/tags`;
		const res = await requestUrl({ url, method: 'GET' });
		const data: OllamaTagsResponse = res.json;
		if (data && Array.isArray(data.models)) {
			return data.models.map(m => m.name);
		}
		return [];
	} catch {
		return [];
	}
}

/**
 * Call the Ollama generate endpoint (non-streaming) and return the raw
 * response text. Returns an empty string on failure.
 */
export async function generate(
	serverUrl: string,
	model: string,
	prompt: string,
	temperature: number,
): Promise<string> {
	try {
		const url = `${serverUrl.replace(/\/+$/, '')}/api/generate`;
		const res = await requestUrl({
			url,
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model,
				prompt,
				temperature,
				stream: false,
			}),
		});
		const data: OllamaGenerateResponse = res.json;
		return data?.response ?? '';
	} catch {
		return '';
	}
}

/**
 * Lightweight reachability check -- attempts to list models.
 * Returns true if the server responds without error.
 */
export async function isReachable(serverUrl: string): Promise<boolean> {
	try {
		const models = await fetchModels(serverUrl);
		// Even an empty model list is fine -- the server responded.
		return models !== null;
	} catch {
		return false;
	}
}
