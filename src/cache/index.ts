import type { FileData, FileChangeType, FileUpdateCallback } from '../types';

const dbName = 'monaco-tsp';

export class FileManager {
	private db: IDBDatabase | null = null;
	private dbVersion = 1;
	private projectUpdateCallbacks: Array<() => void> = [];
	private fileChangeCallbacks: FileUpdateCallback[] = [];

	constructor() {
		this.initDB();
	}

	private initDB() {
		const request = indexedDB.open(dbName, this.dbVersion);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains('projects')) {
				const projectStore = db.createObjectStore('projects', {
					keyPath: 'id',
					autoIncrement: true,
				});

				projectStore.createIndex('name', 'name', { unique: true });
			}
			if (!db.objectStoreNames.contains('files')) {
				const objectStore = db.createObjectStore('files', {
					keyPath: 'id',
					autoIncrement: true,
				});
				objectStore.createIndex('project', 'project', { unique: false });
				objectStore.createIndex('filepath', 'filepath', { unique: false });
				objectStore.createIndex('content', 'content', { unique: false });
			}
		};

		request.onsuccess = (event) => {
			this.db = (event.target as IDBOpenDBRequest).result;
		};

		request.onerror = (event) => {
			console.error(
				`Database error: ${(event.target as IDBOpenDBRequest).error}`,
			);
		};
	}

	public newProject(project: string, files: Omit<FileData, 'project'>[] = []) {
		return new Promise((resolve, reject) => {
			if (!this.db) {
				reject('Database is not initialized');
				return;
			}

			{
				const transaction = this.db.transaction(['projects'], 'readwrite');
				const objectStore = transaction.objectStore('projects');

				const request = objectStore.add({ name: project });

				request.onsuccess = () => {
					this.notifyProjectUpdate();
					if (!files.length) {
						resolve(null);
					} else {
						const transaction = this.db!.transaction(['files'], 'readwrite');
						const objectStore = transaction.objectStore('files');

						files.forEach((file) => {
							objectStore.add({ ...file, project });
						});

						transaction.oncomplete = () => {
							resolve(null);
						};

						transaction.onerror = (event) => {
							reject('Add file error: ' + (event.target as IDBRequest).error);
						};
					}
				};

				request.onerror = (event) => {
					reject('New Project error: ' + (event.target as IDBRequest).error);
				};
			}
		});
	}

	public getProjects(): Promise<string[]> {
		return new Promise((resolve, reject) => {
			if (!this.db) {
				reject('Database is not initialized');
				return;
			}

			const transaction = this.db.transaction(['projects'], 'readonly');
			const objectStore = transaction.objectStore('projects');
			const index = objectStore.index('name');
			const request = index.getAll();

			request.onsuccess = (event) => {
				const result = (event.target as IDBRequest<Array<{ name: string }>>)
					.result;
				if (result && result.length > 0) {
					resolve(result.map((project) => project.name));
				} else {
					resolve([]);
				}
			};

			request.onerror = (event) => {
				reject('Get projects error: ' + (event.target as IDBRequest).error);
			};
		});
	}

	public deleteProject(project: string): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.db) {
				reject('Database is not initialized');
				return;
			}
			{
				const transaction = this.db.transaction(['files'], 'readwrite');
				const objectStore = transaction.objectStore('files');
				const index = objectStore.index('project');
				const request = index.openCursor(IDBKeyRange.only(project));

				request.onsuccess = (event) => {
					this.notifyProjectUpdate();
					const cursor = (event.target as IDBRequest<IDBCursorWithValue>)
						.result;
					if (cursor) {
						cursor.delete();
						cursor.continue();
					} else {
						resolve();
					}
				};

				request.onerror = (event) => {
					reject('Delete project error: ' + (event.target as IDBRequest).error);
				};
			}

			{
				const transaction = this.db.transaction(['projects'], 'readwrite');
				const objectStore = transaction.objectStore('projects');
				const index = objectStore.index('name');
				const request = index.openCursor(IDBKeyRange.only(project));

				request.onsuccess = (event) => {
					const cursor = (event.target as IDBRequest<IDBCursorWithValue>)
						.result;
					if (cursor) {
						cursor.delete();
						cursor.continue();
					} else {
						resolve();
					}
				};

				request.onerror = (event) => {
					reject('Delete project error: ' + (event.target as IDBRequest).error);
				};
			}
		});
	}

	public newOrUpdateFile(file: FileData): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.db) {
				reject('Database is not initialized');
				return;
			}

			const transaction = this.db.transaction(['files'], 'readwrite');
			const objectStore = transaction.objectStore('files');
			const index = objectStore.index('filepath');

			const request = index.openCursor(IDBKeyRange.only(file.filepath));

			request.onsuccess = (event) => {
				const record = (event.target as IDBRequest<IDBCursorWithValue>).result;

				let mr: IDBRequest<IDBValidKey>;
				let type: FileChangeType = 'update';
				if (record) {
					if (record.value.project === file.project) {
						mr = record.update({ ...record.value, ...file });
					} else {
						record.continue();
						return;
					}
				} else {
					type = 'add';
					mr = objectStore.add(file);
				}

				mr.onsuccess = () => {
					this.notifyFileChange(type, file);
					resolve();
				};

				mr.onerror = (event) => {
					reject('Update file error: ' + (event.target as IDBRequest).error);
				};
			};

			request.onerror = (event) => {
				reject('New file error: ' + (event.target as IDBRequest).error);
			};
		});
	}

	public deleteFile(project: string, filepath: string): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.db) {
				reject('Database is not initialized');
				return;
			}

			const transaction = this.db.transaction(['files'], 'readwrite');
			const objectStore = transaction.objectStore('files');
			const index = objectStore.index('project');

			const request = index.getAll(project);

			request.onsuccess = (event) => {
				const results = (event.target as IDBRequest<Required<FileData>[]>)
					.result;
				if (results && results.length > 0) {
					const record = results.find((record) => record.filepath === filepath);
					if (record?.id) {
						const dr = objectStore.delete(record.id);
						dr.onsuccess = () => {
							this.notifyFileChange('delete', record);
							resolve();
						};

						dr.onerror = (event) => {
							reject(
								'Delete file error: ' + (event.target as IDBRequest).error,
							);
						};
					} else {
						resolve();
					}
				} else {
					resolve();
				}
			};

			request.onerror = (event) => {
				reject('Delete file error: ' + (event.target as IDBRequest).error);
			};
		});
	}

	public geProjectFile(project: string, filepath: string): Promise<FileData | null> {
		return new Promise((resolve, reject) => {
			if (!this.db) {
				reject('Database is not initialized');
				return;
			}

			const transaction = this.db.transaction(['files'], 'readonly');
			const objectStore = transaction.objectStore('files');
			const index = objectStore.index('project');
			const request = index.openCursor(IDBKeyRange.only(project));

			request.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
				if (cursor) {
					const file = cursor.value as FileData;
					if (file.filepath === filepath) {
						resolve(file);
					} else {
						cursor.continue();
					}
				} else {
					resolve(null);
				}
			};

			request.onerror = (event) => {
				reject('Get file error: ' + (event.target as IDBRequest).error);
			};
		});
	}

	public geProjectFiles(project: string): Promise<FileData[]> {
		return new Promise((resolve, reject) => {
			if (!this.db) {
				reject('Database is not initialized');
				return;
			}

			const transaction = this.db.transaction(['files'], 'readonly');
			const objectStore = transaction.objectStore('files');
			const index = objectStore.index('project');
			const request = index.openCursor(IDBKeyRange.only(project));

			const files: FileData[] = [];

			request.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
				if (cursor) {
					files.push(cursor.value);
					cursor.continue();
				} else {
					resolve(files);
				}
			};

			request.onerror = (event) => {
				reject('Get files error: ' + (event.target as IDBRequest).error);
			};
		});
	}

	public onFileChange(callback: FileUpdateCallback) {
		this.fileChangeCallbacks.push(callback);
	}

	private notifyFileChange(type: FileChangeType, file: FileData) {
		this.fileChangeCallbacks.forEach((callback) => callback(type, file));
	}

	public onProjectUpdate(callback: () => void) {
		this.projectUpdateCallbacks.push(callback);
	}

	private notifyProjectUpdate() {
		this.projectUpdateCallbacks.forEach((callback) => callback());
	}
}

export const fileManager = new FileManager();
