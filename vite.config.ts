import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Determina la ruta base para el despliegue en GitHub Pages.
// La variable de entorno GITHUB_REPOSITORY está disponible en GitHub Actions.
// Está en el formato 'propietario/nombre-del-repositorio'. Necesitamos '/nombre-del-repositorio/'.
const repoName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : '';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.GITHUB_REPOSITORY': JSON.stringify(process.env.GITHUB_REPOSITORY),
  },
  // Establece la ruta base para el enrutamiento y la carga de activos.
  // Esto es crucial para los despliegues en GitHub Pages donde el sitio se sirve desde una subruta.
  // Para desarrollo local, usará '/', y para la compilación en GitHub Actions, usará '/nombre-del-repositorio/'.
  base: process.env.GITHUB_REPOSITORY ? `/${repoName}/` : '/',
  server: {
    proxy: {
      // Redirige las solicitudes de /x-api a la API oficial de X.
      // Esta es la solución estándar para eludir las restricciones de CORS durante el desarrollo local.
      // Para un despliegue en producción, se necesitaría una configuración similar 
      // en el proveedor de hosting (ej. una función serverless en Vercel/Netlify).
      '/x-api': {
        target: 'https://api.twitter.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/x-api/, ''),
      },
    },
  },
})