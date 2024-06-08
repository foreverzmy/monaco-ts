import * as monaco from 'monaco-editor';
import { fileManager } from './cache';
import { projectSelect, fileSelect } from './actions';
import { TsConfigFileName, demoFiles } from './typescript';
import './index.css';
import { TSP } from './tsp';
import type { FileUpdateCallback } from './types';

class Main {
	tsp: TSP;
	constructor() {
		this.tsp = new TSP(monaco);
		this.initEditor();
		this.initProject();
		fileSelect.onChange(this.handleFileSelectChange);
    fileManager.onFileChange(this.handleFileChange);
    this.tsp.onChange(this.handleCodeChange);
	}

	initEditor = () => {
    const editor = monaco.editor.create(document.getElementById('root')!, {
      fontSize: 16,
      tabSize: 2,
      insertSpaces: true,
    });
		this.tsp.configureEditor(editor);
	};

	initDemoProject = async () => {
		try {
			await fileManager.newProject('demo', demoFiles);
		} catch (err) {
			// do nothing
		}
	};

	handleFileChange: FileUpdateCallback = (type, file) => {
		if (type === 'add') {
			this.tsp.addFiles([file]);
    } 
    if (type === 'delete') {
      this.tsp.removeFile(file.filepath);
    }
  };
  
  handleCodeChange = async (code: string) => {
    const currentProject = projectSelect.value;
    const currentFile = fileSelect.value;

    await fileManager.newOrUpdateFile({
      project: currentProject,
      filepath: currentFile,
      content: code,
    });
  }

	handleFileSelectChange = () => {
		const currentFile = fileSelect.value;
		this.tsp.changeFile(currentFile);
	};

	async initProject() {
		await this.initDemoProject();
		await this.syncProject();
		await this.syncFiles();
		await this.updateTSP();
		fileManager.onProjectUpdate(() => {
			this.syncProject();
			this.syncFiles();
		});
		fileManager.onFileChange((type) => {
			if (type !== 'update') {
				this.syncFiles();
			}
		});
		projectSelect.onChange(async () => {
			await this.syncFiles();
			await this.updateTSP();
		});
	}

	async syncProject() {
		const projects = await fileManager.getProjects();
		const project = projectSelect.value;
		projectSelect.updateOptions(
			projects.map((name) => ({ label: name, value: name })),
		);
		if (projects.length && !projects.includes(project)) {
			projectSelect.value = projects[0];
		} else {
			projectSelect.value = project;
		}
	}

	async syncFiles() {
		const files = await fileManager.geProjectFiles(projectSelect.value);
		fileSelect.updateOptions(
			files.map((file) => ({ label: file.filepath, value: file.filepath })),
		);
		if (files.length) {
			fileSelect.value = files[0].filepath;
		} else {
			fileSelect.value = '';
		}
	}

	updateTSP = async () => {
		this.tsp.release();

		const project = projectSelect.value;
		const files = await fileManager.geProjectFiles(project);
		this.tsp.addFiles(files);
		this.tsp.changeFile(TsConfigFileName);
	};
}

setTimeout(() => {
	new Main();
}, 100);
