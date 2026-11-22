import type { AddedJobPage, AddJobPage } from "@jobpilot/contracts";
import { api } from "../../shared/api.js";

/** The API's side of the tracker. */
export const trackerApi = {
   /**
    * A row for the job applied to on this page, added unless its link has one already; none when the
    * page holds no job. Takes a while: a model reads the page.
    */
   async addFromPage(page: AddJobPage): Promise<AddedJobPage> {
      const response = await api.call("/job-attempts/from-page", {
         method: "POST",
         ...api.jsonBody(page),
      });
      return (await response.json()) as AddedJobPage;
   },
};
