import { describe, expect, it } from "vitest";
import { trackerAddress } from "./address";

describe("trackerAddress.readNewJobUrl", () => {
   it("is the link the extension opened the Add form with", () => {
      const params = new URLSearchParams({
         add: "",
         url: "https://de.indeed.com/viewjob?jk=9efda08701e3b9e6",
      });
      expect(trackerAddress.readNewJobUrl(params)).toBe(
         "https://de.indeed.com/viewjob?jk=9efda08701e3b9e6",
      );
   });

   it("is empty without one, or with one that isn't a web page", () => {
      expect(trackerAddress.readNewJobUrl(new URLSearchParams("add="))).toBe("");
      expect(
         trackerAddress.readNewJobUrl(new URLSearchParams({ url: "javascript:alert(1)" })),
      ).toBe("");
      expect(trackerAddress.readNewJobUrl(new URLSearchParams({ url: "not a link" }))).toBe("");
   });
});

describe("trackerAddress.withPanel", () => {
   it("closing the Add form drops the link it started with, the filter stays", () => {
      const params = new URLSearchParams({ q: "acme", add: "", url: "https://example.com/job" });
      expect(trackerAddress.withPanel(params, null)).toBe("?q=acme");
   });
});
