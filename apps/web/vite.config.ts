import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
   // API_PORT lives in the monorepo root .env, next to the API's other settings
   const env = loadEnv(mode, "../..", "");
   return {
      plugins: [react(), tailwindcss()],
      server: {
         // The app calls /api/...: in dev Vite forwards it to the API, in production a reverse proxy
         // does the same. The browser talks to one origin, so auth cookies will work without CORS.
         proxy: {
            "/api": {
               target: `http://localhost:${env.API_PORT ?? 3000}`,
               rewrite: (path) => path.replace(/^\/api/, ""),
            },
         },
      },
   };
});
