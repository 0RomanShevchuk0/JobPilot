import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";

/**
 * The vacancy's description as the job site laid it out: headings, lists, bold. Job sites break lines
 * with <br>, which come as single line breaks in the markdown: they stay line breaks, not one paragraph.
 */
export function VacancyDescription({ markdown }: { markdown: string }) {
   return (
      <div className="prose prose-sm max-w-none prose-a:text-blue-700">
         <Markdown
            remarkPlugins={[remarkBreaks]}
            components={{
               a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noreferrer">
                     {children}
                  </a>
               ),
            }}
         >
            {markdown}
         </Markdown>
      </div>
   );
}
