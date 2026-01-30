import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        TanStackRouterVite(),
        react(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'https://taskdashboard-api.onrender.com', // User is using Render API
                changeOrigin: true,
                secure: false, // Handle SSL if needed
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
})
