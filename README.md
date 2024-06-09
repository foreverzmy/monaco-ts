# TypeScript Web Studio

## Features

1. **Offline Mode**: Operates entirely within the browser cache, no network required.
2. **Multiple Projects**: Supports multiple TypeScript projects simultaneously.
3. **tsconfig.json Support**: Edit tsconfig.json and see changes take effect immediately.
4. **Theme Support**: Customize the editor with different themes.

## Usage

1. Click the "New Project" button to create a new TypeScript project. A `tsconfig.json` file will be generated automatically.
2. Click the "Add File" button to add a new file. Supports `.ts`, `.json`, and `.md` file types.
3. Edit files and import modules from other files within the project.
4. Press [Cmd + S] to cache your file. Files are not cache automatically and will be lost upon closing the browser if not saved manually.

## Setup

Install the dependencies:

```bash
bun install
```

## Get Started

Start the dev server:

```bash
bun dev
```

Build the app for production:

```bash
bun build
```

Preview the production build locally:

```bash
bun preview
```
