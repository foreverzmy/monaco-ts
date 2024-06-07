import { Select } from './select';
import { Button } from './button';
import { fileManager } from "../cache";
import { DefaultTsConfig, DefaultTsConfigFileName } from "../typescript";

export const themeSelect = new Select('theme');
export const projectSelect = new Select('project');
export const fileSelect = new Select('file');
export const newProjectBtn = new Button('new_project');
export const delProjectBtn = new Button('delete_project');
export const addFileBtn = new Button('add_file');
export const delFileBtn = new Button('delete_file');

newProjectBtn.onClick(() => { 
  const projectName = prompt("Please input project name:", 'helloworld');

  if (!projectName || !/^[a-zA-Z0-9_-]+$/.test(projectName)) {
    alert('The project name is invalid.')
    return
  }

  fileManager.newProject(projectName, [{
    filepath: DefaultTsConfigFileName,
    content: DefaultTsConfig
  }]);
});

delProjectBtn.onClick(() => {
  const currentProject = projectSelect.value;
  const yes = confirm(`Confirm to delete project "${currentProject}"`);
  if (yes) {
    fileManager.deleteProject(currentProject);
  }
});

delFileBtn.onClick(() => { 
  if (fileSelect.value === DefaultTsConfigFileName) {
    alert('"/tsconfig.json" connot be deleted.')
  }

  const currentProject = projectSelect.value;
  const currentFile = fileSelect.value;
  const yes = confirm(`Confirm to delete file "${currentFile}"`);
  if (yes) {
    fileManager.deleteFile(currentProject, currentFile);
  }
});

addFileBtn.onClick(async () => {
  const fileName = prompt("Please input file name:", '/src/index.ts');

  if (!fileName || !/^\/([a-zA-Z0-9_-]+\/?)*(\.\w+)?$/.test(fileName)) {
    alert('The file name is invalid.');
    return;
  }

  const currentProject = projectSelect.value;
  
  const files = await fileManager.geProjectFiles(currentProject);
  if (files.some(file => file.filepath === fileName)) {
    alert('The file name is exists.');
    return;
  }

  await fileManager.newOrUpdateFile({
    project: currentProject,
    filepath: fileName,
    content: '',
  });
});