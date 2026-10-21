import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
   // API_PORT and WEB_PORT live in the monorepo root .env, next to the API's other settings
   const env = loadEnv(mode, "../..", "");
   if (!env.WEB_PORT) throw new Error("Missing environment variable WEB_PORT");
   return {
      plugins: [react(), tailwindcss()],
      server: {
         // the extension takes messages from this origin only (externally_connectable): no moving to
         // the next free port when this one is taken
         port: Number(env.WEB_PORT),
         strictPort: true,
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
