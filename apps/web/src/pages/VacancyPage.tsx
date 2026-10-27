import type { MatchDetails } from "@jobpilot/contracts";
import { useParams } from "react-router";
import {
   MatchEvaluation,
   MatchHeader,
   PostingLinks,
   useMatch,
   VacancyDescription,
} from "../features/matches";
import { BackLink, PageLoader } from "../shared/ui";

/** One vacancy as evaluated for my profile: every job site it is on, the evaluation, the description. */
export function VacancyPage() {
   const { vacancyId } = useParams<{ vacancyId: string }>();
   const match = useMatch(vacancyId!);

   return (
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
         <BackLink fallback="/matches" fallbackLabel="Matches" />
         {match.isPending && <PageLoader />}
         {match.isError && <p className="mt-4 text-red-600">{match.error.message}</p>}
         {match.data && <Vacancy match={match.data} />}
      </main>
   );
}

function Vacancy({ match }: { match: MatchDetails }) {
   const places = match.locations.map((l) => l.raw).join(", ");
   const title = <h1 className="text-2xl font-semibold">{match.title}</h1>;

   return (
      <article className="mt-4">
         <MatchHeader match={match} title={title}>
            {places && <p className="text-sm text-gray-500">{places}</p>}
         </MatchHeader>
         <div className="mt-4">
            <PostingLinks match={match} />
         </div>
         {/* set apart: what JobPilot thinks of the vacancy, not what the job site says */}
         <section className="mt-6 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-blue-900 uppercase">
               AI evaluation
            </h2>
            <MatchEvaluation match={match} withMatchedSkills />
         </section>
         <section className="mt-8">
            <h2 className="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">
               Description
            </h2>
            <VacancyDescription markdown={match.description} />
         </section>
      </article>
   );
}
