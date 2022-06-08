import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const proxy_to = process.env.VITE_API_URL; // See package.json

// https://vitejs.dev/config/
export default defineConfig({
   plugins: [react()],
   publicDir: "frontend/public",
 
   resolve: {
      alias: {
        '@': path.resolve(__dirname, './frontend/src'),
      },
   },
 
   server: {
      proxy: {
         '/data': {
            target: 'http://' + proxy_to,
            changeOrigin: true,
         }
      }
   }
})
