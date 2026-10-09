import type { MatchDetails } from "@jobpilot/contracts";
import { Link, useParams } from "react-router";
import { MatchEvaluation, MatchHeader, PostingLinks, useMatch } from "../features/matches";

/** One vacancy as evaluated for my profile: every job site it is on, the evaluation, the description. */
export function VacancyPage() {
   const { vacancyId } = useParams<{ vacancyId: string }>();
   const match = useMatch(vacancyId!);

   return (
      <main className="mx-auto max-w-4xl p-6">
         <Link to="/matches" className="text-sm text-gray-500 hover:text-gray-900">
            ← Matches
         </Link>
         {match.isPending && <p className="mt-4 text-gray-500">Loading…</p>}
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
         <div className="mt-6">
            <MatchEvaluation match={match} withMatchedSkills />
         </div>
         {/* markdown reads fine as plain text; a renderer can come when it's worth a dependency */}
         <section className="mt-6 border-t border-gray-200 pt-6 text-sm whitespace-pre-wrap">
            {match.description}
         </section>
      </article>
   );
}
