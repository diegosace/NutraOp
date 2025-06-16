// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Esto ya lo tenías, es correcto para Replit

    // --- AÑADIDO PARA HMR EN REPLIT ---
    hmr: {
      clientPort: 443, // Necesario para que el Hot Module Replacement funcione bien en Replit con HTTPS
    },
    // --- FIN DE AÑADIDO PARA HMR ---

    // --- AÑADIDO PARA PERMITIR EL HOST DE REPLIT ---
    allowedHosts: [
      '33801c0f-8529-4acd-b456-5c5dea814ae9-00-3qxp3rrurbxpu.riker.replit.dev', // Este es TU host específico
      // Si en el futuro Replit te da un host ligeramente diferente, podrías necesitar añadirlo aquí también,
      // o usar una opción más general como '.replit.dev' (pero es menos seguro).
      // Por ahora, el host específico es lo mejor.
    ],
    // --- FIN DE AÑADIDO PARA PERMITIR HOST ---
  }
})