// a link's tracking parameters: "utm_source", "utm_campaign"…
const TRACKING_PARAM = /^utm_/;

/**
 * The job's own page for the tracker's link, the same for every way it was opened: Indeed's and
 * LinkedIn's search with the job open in a panel become the job's page; any other link loses its
 * #fragment and utm_ parameters. The tracker finds a job added before by it.
 */
export function directJobUrl(pageUrl: string): string {
   let url: URL;
   try {
      url = new URL(pageUrl);
   } catch {
      return pageUrl;
   }
   if (isHostOf(pageUrl, "indeed.com")) {
      const jobKey = url.searchParams.get("vjk") ?? url.searchParams.get("jk");
      if (jobKey) return `${url.origin}/viewjob?jk=${encodeURIComponent(jobKey)}`;
   }
   if (isHostOf(pageUrl, "linkedin.com")) {
      // "/jobs/view/senior-backend-engineer-at-babbel-4485341351/" or "/jobs/view/4485341351/" → "4485341351"
      const viewed = /^\/jobs\/view\/(?:[^/]*-)?(\d+)/.exec(url.pathname)?.[1];
      const jobId = url.searchParams.get("currentJobId") ?? viewed;
      // digits only: "4485341351", not "abc" put in by hand
      if (jobId && /^\d+$/.test(jobId)) return `https://www.linkedin.com/jobs/view/${jobId}/`;
   }
   url.hash = "";
   for (const name of [...url.searchParams.keys()]) {
      if (TRACKING_PARAM.test(name)) url.searchParams.delete(name);
   }
   return url.toString();
}

/** "de.indeed.com" is of "indeed.com"; "notindeed.com" is not. */
function isHostOf(pageUrl: string, domain: string): boolean {
   try {
      const host = new URL(pageUrl).hostname;
      return host === domain || host.endsWith(`.${domain}`);
   } catch {
      return false;
   }
}
