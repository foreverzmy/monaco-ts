import { Select } from './select';
import { Button } from './button';
import { DefaultTsConfig, TsConfigFileName } from '../typescript';
import type { ProjectStorage } from '../storage/abstract';

const STORAGE_THEME_KEY = 'monaco-theme';
const STORAGE_CURRENT_PROJECT_KEY = 'current-project';
const getStorageProjectActiveFileKey = (project: string) => `project_${project}_active`;

export class ActionManager {
	themeSelect = new Select('theme');
	projectSelect = new Select('project');
	fileSelect = new Select('file');
	newProjectBtn = new Button('new_project');
	delProjectBtn = new Button('delete_project');
	addFileBtn = new Button('add_file');
	delFileBtn = new Button('delete_file');
	storage: ProjectStorage;

  constructor(storage: ProjectStorage) {
    this.storage = storage;
    this.newProjectBtn.onClick(this.handleAddProject);
    this.delProjectBtn.onClick(this.handleDeleteProject);
    this.delFileBtn.onClick(this.handleDeleteFile);
    this.addFileBtn.onClick(this.handleAddFile);
    this.projectSelect.onChange(this.initActiveFile);
  }

	init = async () => {
    await this.initTheme();
    await this.syncProjectOptions();
    await this.initCurrentProject();  
    await this.initProject();
    await this.initFile();
	}

  initTheme = async () => {
		const defaultTheme = localStorage.getItem(STORAGE_THEME_KEY) ?? 'noctis';
    if (defaultTheme) {
			this.themeSelect.value = defaultTheme;
		}
		this.themeSelect.onChange(() => {
			localStorage.setItem(STORAGE_THEME_KEY, this.themeSelect.value);
		});
  };

  initProject = async () => { 
    this.storage.onProjectChange(async (type, project) => {
      await this.syncProjectOptions();
      switch (type) {
        case 'add':
          this.projectSelect.value = project.name;
          break;
        case 'delete':
          this.projectSelect.value = this.projectSelect.options?.[0].value;
          break;
      }
    });

		this.projectSelect.onChange(() => {
			localStorage.setItem(STORAGE_CURRENT_PROJECT_KEY, this.projectSelect.value);
		});
  }

  initFile = async () => {
    this.fileSelect.onChange(() => {
      const currentProject = this.projectSelect.value;
			localStorage.setItem(getStorageProjectActiveFileKey(currentProject), this.fileSelect.value);
    });
  }
  
  syncProjectOptions = async () => {
    const projects = await this.storage.getAllProjects();
    const options = projects.map(p => ({ label: p.name, value: p.name }));
    this.projectSelect.updateOptions(options);
  }

  syncFileOptions = async () => {
    const currentProject = this.projectSelect.value;
    const { files } = await this.storage.getProject(currentProject);
    const options = files.map(file => ({ label: file.filepath, value: file.filepath }));
    this.fileSelect.updateOptions(options);
  }

	initCurrentProject = () => {
    const defaultProject = localStorage.getItem(STORAGE_CURRENT_PROJECT_KEY);
    const options = this.projectSelect.options || [];
		if (defaultProject && options.some(op => op.value === defaultProject)) {
			this.projectSelect.value = defaultProject;
    } else {
      this.projectSelect.value = options[0]?.value;
			localStorage.setItem(STORAGE_CURRENT_PROJECT_KEY, this.projectSelect.value);
    }
  };

  initActiveFile = async () => {
    await this.syncFileOptions();
    const currentProject = this.projectSelect.value;
    const key = getStorageProjectActiveFileKey(currentProject);
    const options = this.fileSelect.options || [];
    const activeFile = localStorage.getItem(key);
		if (activeFile && options.some(op => op.value === activeFile)) {
			this.fileSelect.value = activeFile;
    } else {
      this.fileSelect.value = options[0]?.value;
			localStorage.setItem(key, this.fileSelect.value);
    }
	
  };
  
  handleAddProject = () => { 
    const projectName = prompt('Please input project name:', 'helloworld');
    if (!projectName) {
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(projectName)) {
      alert('The project name is invalid.');
      return;
    }

    this.storage.newProject({ name: projectName }, [{
      project: projectName,
      filepath: TsConfigFileName,
      content: DefaultTsConfig,
    }]);
  }

  handleDeleteProject = () => { 
    const currentProject = this.projectSelect.value;
    const yes = confirm(`Confirm to delete project "${currentProject}"`);
    if (yes) {
      this.storage.deleteProject(currentProject);
    }
  }

  handleDeleteFile = () => { 
    if (this.fileSelect.value === TsConfigFileName) {
      alert('"/tsconfig.json" connot be deleted.');
      return;
    }
  
    const currentProject = this.projectSelect.value;
    const currentFile = this.fileSelect.value;
    const yes = confirm(`Confirm to delete file "${currentFile}"`);
    if (yes) {
      this.storage.deleteFile(currentProject, currentFile);
    }
  }

  handleAddFile = async () => { 
    const fileName = prompt('Please input file name:', '/src/index.ts');
  
    if (!fileName) {
      return;
    }
  
    if (!/^\/([a-zA-Z0-9_-]+\/?)*(\.\w+)?$/.test(fileName)) {
      alert('The file name is invalid.');
      return;
    }
  
    if (!fileName.endsWith('.ts') && !fileName.endsWith('.json') && !fileName.endsWith('.md')) {
      alert('The file name is invalid, only `.ts`/`.json`/`.md` supported.');
      return;
    }
  
    const currentProject = this.projectSelect.value;
  
    const { files } = await this.storage.getProject(currentProject);
    if (files.some((file) => file.filepath === fileName)) {
      alert('The file is exists.');
      return;
    }
  
    await this.storage.addOrUpdateFile({
      project: currentProject,
      filepath: fileName,
      content: '',
    });
  }
}
