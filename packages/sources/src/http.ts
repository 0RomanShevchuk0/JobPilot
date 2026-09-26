const USER_AGENT =
   "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";
const TIMEOUT_MS = 30_000;

export interface TextResponse {
   status: number;
   url: string; // final URL after redirects
   body: string;
}

/** One GET request, no retries: retries and rate limiting belong to the queue. */
export async function getText(url: string): Promise<TextResponse> {
   const res = await fetch(url, {
      headers: {
         "User-Agent": USER_AGENT,
         // pages are localized; parsers rely on English markers
         "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
   });
   return { status: res.status, url: res.url, body: await res.text() };
}
