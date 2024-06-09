import { configure } from '@zenfs/core';
import { WebStorage } from '@zenfs/dom';
import { mkdir, exists, readdir, writeFile, readFile, unlink, rm } from '@zenfs/core/promises';
import type { ProjectStorage } from './abstract';
import type { ProjectData, FileData, FileChangeCallback, ProjectChangeCallback } from '../types';
import { dirname, join } from '../utils/path';
import { mkdirRecursive } from './local_utils';

export class ProjectStorageLocal implements ProjectStorage {
  private configurePromise;
  private fileChangeCallbacks: FileChangeCallback[] = [];
  private projectChangeCallbacks: ProjectChangeCallback[] = [];

  constructor() {
    this.configurePromise = configure({
      disableAsyncCache: true,
      mounts: {
        '/': WebStorage
      }
    });
  }

  public newProject = async (data: ProjectData, files: Omit<FileData, 'project'>[] = []): Promise<ProjectData> => {
    await this.configurePromise;
    const ok = await exists(data.name);
    if (ok) {
      return Promise.reject(new Error('Project exists.'));
    }
    await mkdir(data.name);
    for (const file of files) {
      // DO NOT USE Promise.all
      await this.addOrUpdateFile({ ...file, project: data.name });
    }
    this.notifyProjectChange('add', data);
    return data;
  };

  public getAllProjects = async (): Promise<ProjectData[]> => {
    await this.configurePromise;
    try {
      const files = await readdir('/', { withFileTypes: true });
      return files
        .filter(file => file.isDirectory())
        .map(file => ({ name: file.name }));
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  public getProject = async (name: string): Promise<ProjectData & { files: FileData[]; }> => {
    await this.configurePromise;
    const ok = await exists(name);
    if (!ok) {
      return Promise.reject(new Error('Project not exists.'));
    }
    const projectFiles: FileData[] = [];

    async function readDir(dir: string) {
      const files = await readdir(dir, { withFileTypes: true });
  
      await Promise.all(files.map(async file => {
        const filepath = join(dir, file.name);
  
        if (file.isDirectory()) {
          await readDir(filepath);
        } else {
          const content = await readFile(filepath, 'utf-8');
          projectFiles.push({
            project: name,
            filepath,
            content,
          })
        }
      }))
    };
    
    await readDir(name);
    const files = projectFiles.map(file => ({
      ...file,
      filepath: file.filepath.replace(new RegExp(`^${name}/`), '/')
    }));

    return {
      name,
      files,
    };
  };

  public deleteProject = async (name: string): Promise<ProjectData & { files: FileData[]; }> => {
    await this.configurePromise;
    const ok = await exists(name);
    if (!ok) {
      return { name, files: [] };
    }
    const { files } = await this.getProject(name);
    await rm(name, { recursive: true, force: true });
    this.notifyProjectChange('delete', { name });
    return { name, files };
  }

  public addOrUpdateFile = async (file: FileData): Promise<FileData> => {
    await this.configurePromise;
    const fullFilepath = join(file.project, file.filepath);
    const fileOk = await exists(fullFilepath);
    if (!fileOk) {
      const dir = dirname(fullFilepath);
      const ok = await exists(dir);
      if (!ok) {
        await mkdirRecursive('/', dir);
      }
    }
    await writeFile(`${file.project}${file.filepath}`, file.content);

    this.notifyFileChange(fileOk ? 'update' : 'add', file);

    return file;
  };

  public getFile = async (project: string, filepath: string): Promise<FileData> => {
    await this.configurePromise;
    const fullFilepath = join(project, filepath);
    const ok = await exists(project);
    if (!ok) {
      return Promise.reject('file not exists.')
    }
    const content = await readFile(fullFilepath, 'utf-8');

    return {
      project,
      filepath,
      content,
    }
  };

  public deleteFile = async (project: string, filepath: string): Promise<FileData> => {
    await this.configurePromise;
    const fullFilepath = join(project, filepath);
    const ok = await exists(project);
    if (!ok) {
      return { project, filepath, content: '' }
    }
    
    const content = await readFile(fullFilepath, 'utf-8');
    const file = {
      project,
      filepath,
      content,
    };

    await unlink(fullFilepath);

    this.notifyFileChange('delete', file);

    return file
  };

  private notifyFileChange: FileChangeCallback = (type, file) => {
    this.fileChangeCallbacks.forEach(cb => cb(type, file));
  }

  private notifyProjectChange: ProjectChangeCallback = (type, project) => {
    this.projectChangeCallbacks.forEach(cb => cb(type, project));
  }

  public onFileChange = (cb: FileChangeCallback) => {
    this.fileChangeCallbacks.push(cb);
    return () => this.fileChangeCallbacks = this.fileChangeCallbacks.filter(icb => icb !== cb);
  };

  public onProjectChange = (cb: ProjectChangeCallback) => {
    this.projectChangeCallbacks.push(cb);
    return () => this.projectChangeCallbacks = this.projectChangeCallbacks.filter(icb => icb !== cb);
  };
}
