import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // CRA 호환: REACT_APP_* 를 Vite에서도 읽을 수 있게 shim 처리
  const defineEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith('REACT_APP_')) {
      defineEnv[`process.env.${key}`] = JSON.stringify(value);
    }
  }
  defineEnv['process.env.NODE_ENV'] = JSON.stringify(mode);

  return {
    plugins: [react()],
    define: defineEnv,
    server: {
      port: 3001, // kiwi-design uses port 3001 to avoid conflict with main project
      host: '0.0.0.0',
      open: false,
      // Note: Proxy removed - this project uses Mock API
    },
    build: {
      target: 'es2018',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            // React and core libs
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            // Ant Design components
            'antd-vendor': ['antd', '@ant-design/icons'],
            // Utilities and smaller libs
            'utils-vendor': ['axios', 'dayjs', 'jwt-decode'],
          },
        },
      },
    }
  };
});
