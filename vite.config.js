import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig((opt) => {
  return {
    root: 'src',
    plugins: [wasm()],
    build: {
      target: ['es2022', 'edge89', 'firefox89', 'chrome89', 'safari15'],
      outDir: '../dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          chat: resolve(__dirname, 'src/chat.html'),
          options: resolve(__dirname, 'src/options.html'),
          background: resolve(__dirname, 'src/background.ts')
        },
        output: {
          entryFileNames: '[name].js',
        },
      },
    },
  };
});
