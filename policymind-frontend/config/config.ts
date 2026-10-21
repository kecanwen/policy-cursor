import { defineConfig } from 'umi';
import path from 'path';
import routes from './routes';

export default defineConfig({
  npmClient: 'pnpm',
  routes,
  title: 'PolicyMind · 公考备考 IDE',
  favicons: [],
  alias: {
    '@': path.resolve(__dirname, '../src'),
  },
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
  theme: {
    '@primary-color': '#2563eb',
    '@border-radius-base': '8px',
    '@font-family':
      'Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  metas: [
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1',
    },
  ],
});
