import { defineConfig } from '@rsbuild/core';


export default defineConfig({
  source: {
    entry: {
      index: ['./src/style.css', './src/bootstrap.ts'],
    },
  },
  html: {
    template: './index.html'
  }
});
