// set at build time from the monorepo's .env (wxt.config.ts)
interface ImportMetaEnv {
   /** the API, e.g. "http://localhost:4000" */
   readonly API_URL: string;
   /** the web app, e.g. "http://localhost:5173" */
   readonly WEB_URL: string;
}

interface ImportMeta {
   readonly env: ImportMetaEnv;
}
