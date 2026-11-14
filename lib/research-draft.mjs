/** Read only well-formed research drafts; storage may be unavailable in private browsing. */
export function readResearchDraft(storage, key) {
  try {
    const value = storage.getItem(key);
    if (!value) return null;
    const d = JSON.parse(value);
    if (!["url", "pdf", "image", "note"].includes(d.mode) || !["url", "article", "paper"].includes(d.kind)) return null;
    if (![d.pid, d.url, d.noteText, d.title, d.desc, d.sub, d.tags, d.why, d.meta?.title, d.meta?.site_name, d.meta?.description].every((v) => typeof v === "string")) return null;
    return d;
  } catch { return null; }
}
