import { Button, CheckIcon } from "../../../shared/ui";
import { useMarkSentByHand } from "../../applications";

/**
 * "Mark applied": I applied through the posting myself (on the employer's site, on the job site, or
 * before JobPilot asked: "Already applied to this job"), it is marked sent. Quieter than what goes
 * through JobPilot: the way for when I did it without it.
 */
export function MarkSentByHandButton({ postingId }: { postingId: string }) {
   const markSent = useMarkSentByHand();
   return (
      <span className="flex flex-col items-end gap-1">
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
            <span className="max-w-xs text-right text-sm text-red-600">
               {markSent.error.message}
            </span>
         )}
      </span>
   );
}
