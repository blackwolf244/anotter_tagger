import { TFile } from 'obsidian';
export interface TaggerProvider {
	id: string;
	name: string;
	isAvailable(): Promise<boolean>;
	generateTags(file: TFile): Promise<string[] | null>;
	batchGenerateTags?(files: TFile[]): Promise<void>;
	rebuild?(silent?: boolean): Promise<void>;
}
