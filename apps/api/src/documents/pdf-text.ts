import { extractText } from "unpdf";

/**
 * The text of a PDF, pages joined, whitespace tidied. "" when the PDF has no text layer (a scan, a CV
 * exported as an image). Throws when the file can't be read as a PDF at all.
 */
export async function pdfText(pdf: Uint8Array): Promise<string> {
   // pdf.js may take over (detach) the buffer it is given; the caller still needs the original
   const { text } = await extractText(new Uint8Array(pdf), { mergePages: true });
   return text
      .replace(/[ \t]+\n/g, "\n") // spaces and tabs at the end of a line: "Node.js   \n" → "Node.js\n"
      .replace(/\n{3,}/g, "\n\n") // 3+ line breaks in a row → one empty line between blocks
      .trim();
}
