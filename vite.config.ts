import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'
import path from 'path'

const proxy_to = process.env.VITE_API_URL; // See package.json

// https://vitejs.dev/config/
export default defineConfig({
   plugins: [reactRefresh()],
   publicDir: "frontend/public",
 
   resolve: {
      alias: {
        '@': path.resolve(__dirname, './frontend/src'),
      },
   },
 
   server: {
      proxy: {
         '/api': {
            target: 'http://' + proxy_to,
            changeOrigin: true,
         }
      }
   }
})
