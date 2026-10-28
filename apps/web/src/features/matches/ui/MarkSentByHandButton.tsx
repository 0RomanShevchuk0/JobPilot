import { Button, CheckIcon } from "../../../shared/ui";
import { useMarkSentByHand } from "../../applications";
import { ActionError } from "./ActionError";

/**
 * "Mark applied": I applied through the posting myself (on the employer's site, on the job site, or
 * before JobPilot asked: "Already applied to this job"), it is marked sent. Quieter than what goes
 * through JobPilot: the way for when I did it without it.
 */
export function MarkSentByHandButton({ postingId }: { postingId: string }) {
   const markSent = useMarkSentByHand();
   return (
      // on a phone the full width it's given, as the buttons beside it
      <div className="relative flex flex-col items-stretch gap-1 sm:items-end">
         <Button
            variant="secondary"
            size="sm"
            onClick={() => markSent.mutate(postingId)}
            loading={markSent.isPending}
            title="I applied through this job site myself"
         >
            {!markSent.isPending && <CheckIcon />}
            Mark applied
         </Button>
         {markSent.isError && (
            <ActionError message={markSent.error.message} onClose={() => markSent.reset()} />
         )}
      </div>
   );
}
