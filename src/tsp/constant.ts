import { languages } from 'monaco-editor';

// const jsxFactory = existingConfig.jsxFactory || 'React.createElement';
// const reactNamespace = existingConfig.reactNamespace || 'React';

export const DefaultCompilerOptions: languages.typescript.CompilerOptions = {
  // jsxFactory,
  // reactNamespace,
  jsx: languages.typescript.JsxEmit.React,
  target: languages.typescript.ScriptTarget.ES2016,
  allowNonTsExtensions: true,
  moduleResolution: languages.typescript.ModuleResolutionKind
    .NodeJs,
  module: languages.typescript.ModuleKind.ESNext,
  experimentalDecorators: true,
  noEmit: true,
  allowJs: true,
  typeRoots: [],

  newLine: languages.typescript.NewLineKind.LineFeed,
};
