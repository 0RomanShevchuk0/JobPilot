import { browserSites } from "@jobpilot/sources/page";

// every page of the job sites, as Chrome matches URLs: "https://djinni.co" → "https://djinni.co/*"
export const jobSitePages = browserSites.flatMap((site) =>
   site.origins.map((origin) => `${origin}/*`),
);

// the job sites' hosts: "https://jobs.dou.ua" → "jobs.dou.ua"
export const jobSiteHosts = browserSites.flatMap((site) =>
   site.origins.map((origin) => new URL(origin).hostname),
);
