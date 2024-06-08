export interface FileData {
	id?: number;
	project: string;
	filepath: string;
	content: string;
}

export type FileChangeType = 'add' | 'delete' | 'update';

export type FileUpdateCallback = (type: FileChangeType, file: FileData) => void;

export interface FileRecord {
  [key: string]: string;
}

export interface LayeredObject {
  [key: string]: string | LayeredObject;
}
