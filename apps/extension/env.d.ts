// set at build time from the monorepo's .env (wxt.config.ts)
interface ImportMetaEnv {
   /** the API, its routes included, e.g. "http://localhost:4000/api" */
   readonly API_URL: string;
   /** the web app, e.g. "http://localhost:5173" */
   readonly WEB_URL: string;
}

interface ImportMeta {
   readonly env: ImportMetaEnv;
}
