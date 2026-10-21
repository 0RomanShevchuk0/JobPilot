import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
   // API_PORT, WEB_PORT and EXTENSION_ID live in the monorepo root .env, next to the API's other settings
   const env = loadEnv(mode, "../..", "");
   const required = (name: string): string => {
      const value = env[name];
      if (!value) throw new Error(`Missing environment variable ${name}`);
      return value;
   };
   const apiPort = required("API_PORT");
   const webPort = required("WEB_PORT");
   const extensionId = required("EXTENSION_ID");

   return {
      plugins: [react(), tailwindcss()],
      // the extension the app talks to, in the code: import.meta.env.EXTENSION_ID
      define: { "import.meta.env.EXTENSION_ID": JSON.stringify(extensionId) },
      server: {
         // the extension takes messages from this origin only (externally_connectable): no moving to
         // the next free port when this one is taken
         port: Number(webPort),
         strictPort: true,
         // The app calls /api/...: in dev Vite forwards it to the API, in production a reverse proxy
         // does the same. The browser talks to one origin, so auth cookies will work without CORS.
         proxy: {
            "/api": {
               target: `http://localhost:${apiPort}`,
               rewrite: (path) => path.replace(/^\/api/, ""), // "/api/profile" → "/profile"
            },
         },
      },
   };
});
