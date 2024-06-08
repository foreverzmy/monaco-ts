export interface ProjectData {
	name: string;
}

export interface FileData {
	project: string;
	filepath: string;
	content: string;
}

export type FileChangeType = 'add' | 'delete' | 'update';


export type ProjectChangeCallback = (type: FileChangeType, project: ProjectData) => void;

export type FileChangeCallback = (type: FileChangeType, file: FileData) => void;

export interface FileRecord {
  [key: string]: string;
}

export interface LayeredObject {
  [key: string]: string | LayeredObject;
}
