import { defineConfig } from '@rsbuild/core';


export default defineConfig({
  source: {
    entry: {
      index: ['./src/config.ts', './src/index.ts'],
    },
  },
  html: {
    template: './index.html'
  }
});
