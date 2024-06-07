import { fileManager } from './cache';
import { projectSelect, fileSelect } from './actions';
import { demoFiles } from './typescript';
import './index.css';

class Main {
  constructor() {
    this.initProject();
  }

  initDemoProject = async () => {
    try {
      await fileManager.newProject('demo', demoFiles);
    } catch (err) {
      // do nothing
    }
  }

  async initProject() {
    await this.initDemoProject();
    await this.syncProject();
    await this.syncFiles();
    fileManager.onProjectUpdate(() => {
      this.syncProject();
      this.syncFiles();
    });
    fileManager.onFileChange((type) => { 
      if (type !== 'update') {
        this.syncFiles();
      }
    });
    projectSelect.onChange(() => {
      this.syncFiles();
    });
  }

  async syncProject() {
    const project = projectSelect.value;
    const projects = await fileManager.getProjects();
    projectSelect.updateOptions(projects.map(name => ({ label: name, value: name })));
    if (projects.length && !projects.includes(project)) {
      projectSelect.value = projects[0];
    } else {
      projectSelect.value = project;
    }
  }

  async syncFiles() {
    const files = await fileManager.geProjectFiles(projectSelect.value);
    fileSelect.updateOptions(files.map(file => ({ label: file.filepath, value: file.filepath })));
    if (files.length) {
      fileSelect.value = files[0].filepath;
    } else {
      fileSelect.value = '';
    }
  }
}

setTimeout(() => {
  new Main();
}, 100);
