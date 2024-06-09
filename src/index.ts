import * as monaco from 'monaco-editor';
import { ActionManager } from "./actions";
import { ProjectStorageLocal } from "./storage";
import { TSP } from './tsp';
import { demoFiles } from './typescript';

export default class Main {
  storage = new ProjectStorageLocal();
  action = new ActionManager(this.storage);
  tsp = new TSP(monaco);

  constructor() {
    this.syncTheme();
    this.syncProject();
    this.syncFile();
    this.asyncInit();
    this.tsp.onChange(this.handleCodeChange);
  }

  get currentProject() {
    return this.action.projectSelect.value;
  }

  get currentFile() {
    return this.action.fileSelect.value;
  }

  asyncInit = async () => {
    await this.initDemoProject();
    await this.action.init();
    await this.initEditor();
  }

  syncTheme = () => {
    this.action.themeSelect.onChange((theme) => {
      this.tsp.updateTheme(theme);
    });
  }

  syncProject = () => {
    this.action.projectSelect.onChange(project => { 
      this.switchProject(project);
    });
  }

  syncFile = () => {
    this.action.fileSelect.onChange(filepath => {
      this.tsp.changeFile(filepath);
    });
    this.storage.onFileChange(async (type, file) => {
      switch (type) { 
        case 'add':
          await this.tsp.addFiles([file]);
          this.action.fileSelect.value = file.filepath;
          break;
        case 'delete':
          await this.tsp.removeFile(file.filepath);
          this.action.fileSelect.value = this.action.fileSelect.options?.[0].value ?? '';
          break;
      }
    });
  }

  initEditor = async () => {
    const editor = monaco.editor.create(document.getElementById('root')!, {
      fontSize: 16,
      tabSize: 2,
      insertSpaces: true,
    });
    await this.tsp.configureEditor(editor);
    this.tsp.updateTheme(this.action.themeSelect.value);
  };

	initDemoProject = async () => {
		try {
      await this.storage.newProject({ name: 'demo' }, demoFiles);
		} catch (err) {
			// do nothing
		}
	};

  switchProject = async (project: string) => {
    this.tsp.release();
    const projectDetail = await this.storage.getProject(project);
    await this.tsp.addFiles(projectDetail.files);
    this.tsp.changeFile(this.action.fileSelect.value);
  }

  handleCodeChange = async (code: string) => {
    await this.storage.addOrUpdateFile({
      project: this.currentProject,
      filepath: this.currentFile,
      content: code,
    });
  }
}
