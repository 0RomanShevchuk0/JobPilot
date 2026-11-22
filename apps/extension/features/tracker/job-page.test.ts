import { describe, expect, it } from "vitest";
import { directJobUrl } from "./job-page.js";

describe("directJobUrl", () => {
   it("turns LinkedIn's search with a job open in its panel into the job's page", () => {
      expect(
         directJobUrl(
            "https://www.linkedin.com/jobs/search-results/?currentJobId=4485341351&keywords=jobs",
         ),
      ).toBe("https://www.linkedin.com/jobs/view/4485341351/");
   });

   it("turns LinkedIn's job page with its slug into the plain one", () => {
      expect(
         directJobUrl(
            "https://de.linkedin.com/jobs/view/senior-backend-engineer-at-babbel-4485341351?trk=x",
         ),
      ).toBe("https://www.linkedin.com/jobs/view/4485341351/");
   });

   it("turns Indeed's search with a job open in its panel into the job's page", () => {
      expect(directJobUrl("https://de.indeed.com/?from=gnav&vjk=9efda08701e3b9e6")).toBe(
         "https://de.indeed.com/viewjob?jk=9efda08701e3b9e6",
      );
   });

   it("keeps Indeed's own job page as just its job key", () => {
      expect(directJobUrl("https://de.indeed.com/viewjob?jk=501858924e9ef19f&from=serp")).toBe(
         "https://de.indeed.com/viewjob?jk=501858924e9ef19f",
      );
   });

   it("drops the fragment and utm_ parameters of any other link, keeping the rest", () => {
      expect(
         directJobUrl("https://jobs.example.com/apply?id=7&utm_source=x&utm_medium=y#top"),
      ).toBe("https://jobs.example.com/apply?id=7");
   });

   it("doesn't take a look-alike domain for LinkedIn", () => {
      expect(directJobUrl("https://notlinkedin.com/jobs/view/123/")).toBe(
         "https://notlinkedin.com/jobs/view/123/",
      );
   });
});
