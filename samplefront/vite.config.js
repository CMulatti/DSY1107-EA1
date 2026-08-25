import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
plugins: [react()],
server: {
// El puerto está fijo a propósito: es el que quedó autorizado en Cognito
// (callback_urls) y en el CORS del API Gateway. strictPort evita que Vite
// se cambie solo al 5174 y el login falle con redirect_mismatch.
port: 5173,
strictPort: true,
},
})