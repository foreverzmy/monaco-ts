import tsConfig from './default.tsconfig.json';
export { default as tsConfigSchema } from './tsconfig.schema.json';

export const TsConfigFileName = '/tsconfig.json';
export const DefaultTsConfig = JSON.stringify(tsConfig, null, 2);

export const demoFiles = [
  {
    filepath: '/README.md',
    content: `# TypeScript Web Studio

## Features

1. [Offline Mode]: Operates entirely within the browser cache, no network required.
2. [Multiple Projects]: Supports multiple TypeScript projects simultaneously.
3. [tsconfig.json Support]: Edit tsconfig.json and see changes take effect immediately.
4. [Theme Support]: Customize the editor with different themes.

## Usage

1. Click the "New Project" button to create a new TypeScript project. A \`tsconfig.json\` file will be generated automatically.
2. Click the "Add File" button to add a new file. Supports \`.ts\`, \`.json\`, and \`.md\` file types.
3. Edit files and import modules from other files within the project.
4. Press [Cmd + S] to cache your file. Files are not cache automatically and will be lost upon closing the browser if not saved manually.
`,
  },
  {
    filepath: '/tsconfig.json',
    content: DefaultTsConfig,
  },
  {
    filepath: '/index.ts',
    content: `import { sum } from './utils';

window.addEventListener('DOMContentLoaded', () => {
  alert(sum('hello', 'world'));
});
    `,
  },
  {
    filepath: '/utils.ts',
    content: `export const sum = (a: number, b: number) => a + b;`,
  },
]
