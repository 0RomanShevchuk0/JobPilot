import { buttonStyles } from "../../../shared/ui";

/**
 * In place of Apply when the job site sends applicants to the employer's site: JobPilot can't apply
 * there, the user does it themselves and marks the posting Applied.
 */
export function ExternalApplyLink({ url }: { url: string }) {
   return (
      <a
         href={url}
         target="_blank"
         rel="noreferrer"
         className={buttonStyles({ variant: "primary", size: "sm" })}
      >
         Apply on employer's site ↗
      </a>
   );
}
