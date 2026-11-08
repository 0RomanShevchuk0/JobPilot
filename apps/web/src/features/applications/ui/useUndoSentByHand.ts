import { ApiError } from "../../../shared/api/client";
import { useUnmarkSentByHand } from "../api/queries";

/**
 * Undo of an application sent by hand. When it is the only application of a tracker row I changed
 * (409), what I wrote there goes too: asked first, nothing is undone on no. onUndone runs once it is
 * taken back.
 */
export function useUndoSentByHand() {
   const unmarkSent = useUnmarkSentByHand();

   function undoSentByHand(applicationId: string, onUndone?: () => void) {
      unmarkSent.mutate(
         { applicationId },
         {
            onSuccess: onUndone,
            onError: (refusal) => {
               if (!(refusal instanceof ApiError && refusal.status === 409)) return;
               const removesRow = window.confirm(
                  "Its row in the Tracker goes too, with what you changed in it. Undo anyway?",
               );
               if (removesRow) {
                  unmarkSent.mutate(
                     { applicationId, withTrackerRow: true },
                     { onSuccess: onUndone },
                  );
               } else {
                  unmarkSent.reset();
               }
            },
         },
      );
   }

   return {
      undoSentByHand,
      isPending: unmarkSent.isPending,
      error: unmarkSent.error,
      reset: unmarkSent.reset,
   };
}
