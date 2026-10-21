// set at build time from the monorepo's .env (vite.config.ts)
interface ImportMetaEnv {
   /** the JobPilot extension's id, e.g. "dakikehdmagghigijcpneocecnenklba" */
   readonly EXTENSION_ID: string;
}
