import "server-only";
import { extractText, getDocumentProxy } from "unpdf";

/** Extract readable text from a PDF buffer. Returns null for scanned/image-only PDFs. */
export async function extractPdfText(buf: ArrayBuffer): Promise<string | null> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    const t = (Array.isArray(text) ? text.join("\n") : text).replace(/\s+\n/g, "\n").trim();
    return t.length > 20 ? t.slice(0, 200_000) : null;
  } catch {
    return null;
  }
}
