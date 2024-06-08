import type { FileData, FileChangeCallback, ProjectData, ProjectChangeCallback } from '../types/file';

export interface ProjectStorage {
  // create a new project
  newProject: (data: ProjectData, files?: FileData[]) => Promise<ProjectData>;
  // get all projects
  getAllProjects: () => Promise<ProjectData[]>;
  // get project detail with all files
  getProject: (name: string) => Promise<ProjectData & { files: FileData[] }>;
  // delete a project with all files
  deleteProject: (name: string) => Promise<ProjectData & { files: FileData[] }>;
  
  // add project a file
  addOrUpdateFile: (file: FileData) => Promise<FileData>;
  // get a file detail
  getFile: (project: string, filepath: string) => Promise<FileData>;
  // delete a file
  deleteFile: (project: string, filepath: string) => Promise<FileData>;

  onFileChange: (cb: FileChangeCallback) => void;

  onProjectChange: (cb: ProjectChangeCallback) => void;
}
