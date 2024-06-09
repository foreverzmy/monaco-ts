import type Monaco from 'monaco-editor';
import debounce from 'lodash/debounce';
import { dirname, getFileExtension, join } from '../utils/path';
import { formatCompilerOptions } from './utils';
import type { FileData, ModuleCorrection, ModuleError } from '../types';
import { DefaultCompilerOptions, fileLanguage } from './constant';
import { setTheme } from '../themes';
import { TsConfigFileName, tsConfigSchema } from '../typescript';

interface ModelCache {
	model: Monaco.editor.IModel;
	lib: any;
	viewState: Monaco.editor.ICodeEditorViewState;
}

export class TSP {
  private monaco: typeof Monaco;
	private editor: Monaco.editor.IStandaloneCodeEditor | null = null;
  private files: Record<string, FileData> = {};
	private currentFile = '';
	private modelCache: Record<string, ModelCache> = {};
	private creatingModelMap: Map<string, Promise<any>> = new Map();
	private dependencies: Record<string, any> = {};
  private compilerOptions?: Monaco.languages.typescript.CompilerOptions;
  private codeChangeCallbacks: Array<(code: string) => void> = [];

	constructor(monaco: typeof Monaco) {
		this.monaco = monaco;
		this.commitLibChanges = debounce(this.commitLibChanges, 300);
    this.resizeEditor = debounce(this.resizeEditorInstantly, 150);
    this.notifySave = debounce(this.notifySave, 300);
    this.monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [{
        uri: 'https://json.schemastore.org/tsconfig',
        fileMatch: ['**/tsconfig.json'],
        schema: tsConfigSchema
      }],
    });
  }

  public addFiles = async (files: FileData[]) => {
    files.forEach(file => { 
      this.files[file.filepath] = file;
      if (file.filepath === TsConfigFileName) {
        this.setTSConfig(JSON.parse(file.content));
      }
    });
    await this.initializeModules(files);
  };

  public removeFile = async (filepath: string) => {
    this.creatingModelMap.delete(filepath);
    delete this.files[filepath];
    this.modelCache[filepath]?.model.dispose();
    delete this.modelCache[filepath];
    this.updateModules();
  }

  private initializeModules = (files: FileData[] = Object.values(this.files)) => {
    return Promise.all(files.map((file) => this.createModel(file.filepath, file.content)));
  }

  private createModel = (
    filePath: string,
    fileContent: string,
  ) => {
    if (this.creatingModelMap.has(filePath)) {
      return this.creatingModelMap.get(filePath);
    }
    // Prevent race conditions
    this.creatingModelMap.set(filePath, (async () => {
      const monaco = this.monaco;
      const lib = this.addLib(fileContent, filePath);
      
      const ext = getFileExtension(filePath);
      const language = fileLanguage[ext] || '';
      const model = monaco.editor.createModel(
        fileContent,
        language,
        monaco.Uri.from({ path: filePath, scheme: 'file' })
      );

      if (filePath === TsConfigFileName) {
        model.onDidChangeContent(() => { 
          const code = model.getValue(1, false);
          try {
            const config = JSON.parse(code);
            this.setTSConfig(config);
          } catch (error) {
            console.error(error);
          }
        });
      }

      this.modelCache[filePath] = this.modelCache[filePath] || {
        model: null,
        decorations: [],
        viewState: null,
      };
      this.modelCache[filePath].model = model;
      this.modelCache[filePath].lib = lib;

      this.creatingModelMap.delete(filePath)
      return model;
    })());

    return this.creatingModelMap.get(filePath);
  };

  private addLib = (code: string, path: string) => {
    const monaco = this.monaco;
    const fullPath = `file://${path}`;

    const existingLib = monaco.languages.typescript.typescriptDefaults.getExtraLibs()[
      fullPath
    ];
    // Only add it if it has been added before, we don't care about the contents
    // of the libs, only if they've been added.

    if (!existingLib) {
      // We add it manually, and commit the changes manually
      (monaco.languages.typescript.typescriptDefaults as any)._extraLibs[
        fullPath
      ] = code;
      this.commitLibChanges();
    }
  };

  /**
  * We manually commit lib changes, because if do this for *every* change we will
  * reload the whole TS worker & AST for every change. This method is debounced
  * by 300ms.
  */
  private commitLibChanges = () => {
    const monaco = this.monaco;
    (monaco.languages.typescript.typescriptDefaults as any)._onDidChange.fire(
      monaco.languages.typescript.typescriptDefaults
    );

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
  };


  private setCompilerOptions = () => {
    const monaco = this.monaco;
    const existingConfig = this.compilerOptions ?? {};

    const compilerOptions = formatCompilerOptions({
      ...DefaultCompilerOptions,
      ...existingConfig
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions(
      compilerOptions
    );
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions(
      compilerOptions
    );

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
  };
  
  private setTSConfig = <T extends { compilerOptions: Monaco.languages.typescript.CompilerOptions }>(config: T) => {
    this.compilerOptions = config.compilerOptions;

    this.setCompilerOptions();
  };


  async configureEditor(editor: Monaco.editor.IStandaloneCodeEditor) {
    this.editor = editor;

    this.monaco.languages.typescript.typescriptDefaults.setMaximumWorkerIdleTime(-1);
    this.monaco.languages.typescript.javascriptDefaults.setMaximumWorkerIdleTime(-1);

    this.monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
    this.monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

    this.setCompilerOptions();

    this.initializeModules();
    if(this.currentFile) {
      await this.openNewModel(this.currentFile);
    }

    window.addEventListener('resize', this.resizeEditor);

    // cmd + p
    editor.addAction({
      // An unique identifier of the contributed action.
      id: 'fuzzy-search',

      // A label of the action that will be presented to the user.
      label: 'Open Module',

      // An optional array of keybindings for the action.
      keybindings: [this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KeyP],

      // A precondition for this action.
      precondition: undefined,

      // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
      keybindingContext: undefined,

      contextMenuGroupId: 'navigation',

      contextMenuOrder: 1.5,

      // Method that will be executed when the action is triggered.
      // @param editor The editor instance is passed in as a convinience
      run: () => {
        console.log('fuzzy-search');
      },
    });

    // cmd + s
    editor.addCommand(
      // eslint-disable-next-line
      this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KeyS,
      () => {
        this.notifySave();
      }
    );

    this.registerAutoCompletions();
  }

  private openNewModel = async (filePath: string) => {
    const modelInfo = await this.getModelByPath(filePath);
    const newCode = this.files[filePath]?.content;
    if (!modelInfo) {
      return;
    }

    if (newCode !== modelInfo.model.getValue(1)) {
      modelInfo.model.setValue(newCode);
    }

    this.currentFile = filePath;
    this.editor?.setModel(modelInfo.model);

    requestAnimationFrame(() => {
      if (modelInfo.viewState) {
        this.editor?.restoreViewState(modelInfo.viewState);
      }

      // this.lint(
      //   modelInfo.model.getValue(1),
      //   title,
      //   modelInfo.model.getVersionId()
      // );
    });
  };

  private getModelByPath = async (filePath: string) => {
    const {  modelCache } = this;

    if (!modelCache[filePath] || !modelCache[filePath].model) {
      if (this.files[filePath]) {
        await this.createModel(filePath, this.files[filePath].content);
      }
    }

    return modelCache[filePath];
  };

  public changeFile = (fileName: string) => {
    this.changeModule(fileName);
  }

  private changeModule = (
    filePath: string,
    errors?: Array<ModuleError>,
    corrections?: Array<ModuleCorrection>
  ) => {
    const oldFile = this.currentFile;

    this.swapDocuments(oldFile, filePath)
      .then(() => {
        this.currentFile = filePath;

        if (errors) {
          this.setErrors(errors);
        }

        if (corrections) {
          this.setCorrections(corrections);
        }
      });
  };

  swapDocuments = (currentFile: string, nextFile: string) => {
    if(!this.editor) {
      return Promise.reject('no editor')
    }
    // We get the id here because we don't want currentModule to mutate in the meantime.
    // If the module changes in the store, and we use it here it will otherwise
    // throw an error 'Cannot use detached model'. So that's why we get the desired values first.

    return new Promise(resolve => {
      // We load this in a later moment so the rest of the ui already updates before the editor
      // this will give a perceived speed boost. Inspiration from vscode team
      setTimeout(async () => {
        if (currentFile && this.modelCache[currentFile]) {
          this.modelCache[currentFile].viewState = this.editor?.saveViewState()!;
          if (this.modelCache[currentFile].lib) {
            // We let Monaco know what the latest code is of this file by removing
            // the old extraLib definition and defining a new one.
            this.modelCache[currentFile].lib.dispose();
            this.modelCache[currentFile].lib = this.addLib(this.files[currentFile].content, currentFile);
          }
        }

        await this.openNewModel(nextFile);
        this.editor?.focus();
        resolve(null);
      }, 50);
    });
  };

  setCorrections = (corrections: Array<ModuleCorrection>) => {
    if(!this.editor) {
      return
    }
    const monaco = this.monaco;
    if (corrections.length > 0) {
      const currentPath = this.editor.getModel()!.uri.path;

      const correctionMarkers = corrections
        .filter(correction => correction.path === currentPath)
        .map(correction => {
          if (correction) {
            return {
              severity:
                correction.severity === 'warning'
                  ? monaco.MarkerSeverity.Warning
                  : monaco.MarkerSeverity.Info,
              startColumn: correction.column,
              startLineNumber: correction.line,
              endColumn: correction.columnEnd || 1,
              endLineNumber: correction.lineEnd || correction.line + 1,
              message: correction.message,
              source: correction.source,
            };
          }

          return null;
        })
        .filter(x => x);

      monaco.editor.setModelMarkers(
        this.editor.getModel()!,
        'correction',
        correctionMarkers as any
      );
    } else {
      monaco.editor.setModelMarkers(
        this.editor.getModel()!,
        'correction',
        []
      );
    }
  };

  setErrors = (errors: Array<ModuleError>) => {
    if(!this.editor) {
      return
    }
    const monaco = this.monaco;
    if (errors.length > 0) {
      const currentPath = this.editor.getModel()!.uri.path;
      const thisModuleErrors = errors.filter(
        error => error.path === currentPath
      );
      const errorMarkers = thisModuleErrors
        .map(error => {
          if (error) {
            return {
              severity: monaco.MarkerSeverity.Error,
              startColumn: 1,
              startLineNumber: error.line,
              endColumn: error.columnEnd || error.column,
              endLineNumber: error.lineEnd || error.line + 1,
              message: error.message,
            };
          }

          return null;
        })
        .filter(x => x);

      monaco.editor.setModelMarkers(
        this.editor.getModel()!,
        'error',
        errorMarkers as any
      );
    } else {
      monaco.editor.setModelMarkers(this.editor.getModel()!, 'error', []);
    }
  };

  registerAutoCompletions = () => {
    if(!this.editor || this.currentFile) {
      return
    }
    const monaco = this.monaco;
    monaco.languages.registerCompletionItemProvider('typescript', {
      triggerCharacters: ["'", '"', '/', '.'],
      provideCompletionItems: (model, position) => {
        if (!this.currentFile) {
          return
        }
        // Get editor content before the pointer
        const textUntilPosition = model.getValueInRange(
          {
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
          1
        );

        const word = model.getWordUntilPosition(position);
        const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);

        const match = textUntilPosition.match(/from\s+['"]{1}(\.{1,2}[a-zA-Z0-9/_-]*)$/);

        if (match) {
          const prefix = match[1];
          if(!prefix) {
            return
          }

          const relativePath = join(dirname(this.currentFile), prefix);

          const suggestions = Object.keys(this.files)
            .filter(filePath => filePath.startsWith(relativePath))
            .map(filePath => {
              if (!filePath) return null;

              // Don't keep extension for JS files
              if (filePath.endsWith('.js')) {
                filePath = filePath.replace(/\.js$/, '');
              }

              // Don't keep extension for TS files
              if (filePath.endsWith('.ts')) {
                filePath = filePath.replace(/\.ts$/, '');
              }

              return {
                label:`${prefix}${ filePath.replace(relativePath, relativePath === '/' ? '/' : '')}`.replace('//', '/'),
                insertText: filePath.slice(
                  !relativePath.endsWith('/') ? 0 : relativePath.length
                ),
                kind: monaco.languages.CompletionItemKind.File,
                range,
              };
            })
            .filter(Boolean);
          return { suggestions } as Monaco.languages.CompletionList 
        }
        
        return;
      },
    });
  };

  // resize without debounce
  resizeEditorInstantly = () => {
    this.editor?.layout();
  };

  // resize debounce 150
  resizeEditor = () => {
    this.resizeEditorInstantly();
  };

  updateReadOnly(readOnly: boolean) {
    this.editor?.updateOptions({ readOnly });
  }

  updateTheme(themeName: string) {
    setTheme(this.monaco, themeName);
  }

  updateModules = () => {
    const { modelCache } = this;

    Object.entries(this.files).forEach(([filePath, file]) => {
      const fileContent = file.content;
      if (modelCache[filePath] && modelCache[filePath].model) {

        if (filePath === '') {
          // Parent dir got deleted
          this.disposeModel(filePath);
          return;
        }

        // Check for changed path, if that's
        // the case create a new model with corresponding tag, ditch the other model
        if (filePath !== modelCache[filePath].model.uri.path) {
          const isCurrentlyOpened =
            this.editor?.getModel() === modelCache[filePath].model;

          if (isCurrentlyOpened) {
            // Unload model, we're going to dispose it
            this.editor?.setModel(null);
          }

          this.disposeModel(filePath);

          this.createModel(filePath, fileContent)?.then(
            newModel => {
              if (isCurrentlyOpened) {
                // Open it again if it was open
                this.editor?.setModel(newModel);
              }
            }
          );
        }
      }
    });

    // Also check for deleted modules
    Object.keys(modelCache).forEach(filePath => {
      // This module got deleted, dispose it
      if (!this.files[filePath]) {
        this.disposeModel(filePath);
      }
    });
  };

  getCode = () =>
    this.editor?.getValue({
      preserveBOM: false,
      lineEnding: '\n',
    });

  updateCode = (code: string) => {
    const model = this.editor?.getModel();
    model?.setValue(code);
  }

  public changeCode = (code: string, filePath?: string) => {
    if (
      code !== this.getCode() &&
      (filePath || this.currentFile === filePath)
    ) {
      this.updateCode(code);
      // this.lint(
      //   code,
      //   this.currentModule.title,
      //   this.editor.getModel().getVersionId()
      // );
    }
  };

  private notifySave = () => {
    const newCode = this.editor?.getModel()?.getValue(1) || '';
    // const { currentModule } = this;
    // const { title } = currentModule;
    const oldCode = this.files[this.currentFile]?.content || '';

    const codeEquals =
      oldCode.replace(/\r\n/g, '\n') === newCode.replace(/\r\n/g, '\n');

    if (!codeEquals) {
      this.files[this.currentFile].content = newCode;
      this.codeChangeCallbacks.forEach(cb => cb(newCode));
      // this.lint(newCode, title, this.editor.getModel().getVersionId());
    }
  };

  onChange = (cb: (code: string) => void) => {
    this.codeChangeCallbacks.push(cb);

    return () => this.codeChangeCallbacks = this.codeChangeCallbacks.filter(icb => cb !== icb);
  }

  release = () => {
    this.disposeModules();
    this.files = {};
    this.currentFile = '';
    this.creatingModelMap = new Map();
    this.dependencies = {};
  }

  dispose = () => {
    window.removeEventListener('resize', this.resizeEditor);
    this.disposeModules();
    this.editor?.dispose();
    this.files = {};
    this.currentFile = '';
    this.creatingModelMap = new Map();
    this.dependencies = {};
  }

  disposeModules = () => {
    this.editor?.setModel(null);
    Object.keys(this.files).forEach(filePath => {
      this.disposeModel(filePath);
    });

    this.modelCache = {};
  };

  disposeModel = (id: string) => {
    if (this.modelCache[id]) {
      try {
        if (this.modelCache[id].model && !this.modelCache[id].model.isDisposed()) {
          this.modelCache[id].model.dispose();
        }
        if (this.modelCache[id].lib && !this.modelCache[id].lib.isDisposed()) {
          this.modelCache[id].lib.dispose();
        }

        delete this.modelCache[id];
      } catch (e) {
        console.error(e);
      }
    }
  };
}
