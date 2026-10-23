import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type ServerOptions } from "vite";

export default defineConfig(({ command, mode }) => {
   // the monorepo root .env (or the environment, as in CI), next to the API's other settings
   const env = loadEnv(mode, "../..", "");
   const required = (name: string): string => {
      const value = env[name];
      if (!value) throw new Error(`Missing environment variable ${name}`);
      return value;
   };

   return {
      plugins: [react(), tailwindcss()],
      // the dev server only: a build is static files, served behind a reverse proxy (Caddy) on the server
      server: command === "serve" ? devServer(required) : undefined,
   };
});

/** Vite's dev server, on the machine the API runs on too. */
function devServer(required: (name: string) => string): ServerOptions {
   // the web app as the browser opens it: Vite listens on its port ("http://localhost:5173" → 5173)
   const webPort = new URL(required("WEB_URL")).port;
   return {
      // the extension takes messages from this origin only (externally_connectable): no moving to the
      // next free port when this one is taken
      port: Number(webPort),
      strictPort: true,
      // The app calls /api/...: in dev Vite forwards it to the API as it is (the API's routes are under
      // /api), in production a reverse proxy does the same. The browser talks to one origin, so the
      // sign-in cookie works without CORS.
      proxy: { "/api": `http://localhost:${required("API_PORT")}` },
   };
}
