// set at build time from the monorepo's .env (wxt.config.ts)
interface ImportMetaEnv {
   /** the API, e.g. "http://localhost:4000" */
   readonly API_URL: string;
}

interface ImportMeta {
   readonly env: ImportMetaEnv;
}
