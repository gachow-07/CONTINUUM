import type { Chunk } from "./corpus";

const STOP = new Set("a an the of to in on for and or is are was were be been it its this that these those we our us you your i do did does why how what which who when where with as at by from about into than then there should would could can will not no any all have has had".split(" "));

const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, "").replace(/e$/, "");
const tokenize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9.\s-]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w)).map(stem).filter((w) => w.length > 1);

export interface Retrieved { chunk: Chunk; score: number; forced?: boolean }

/** BM25 over the project's chunks, plus intent-based inclusion of issue / next-step / timeline material. */
export function retrieve(query: string, chunks: Chunk[], k = 10): Retrieved[] {
  const q = tokenize(query);
  const docs = chunks.map((c) => ({ c, toks: tokenize(c.title + " " + c.title + " " + c.text) }));
  const N = docs.length;
  const avg = docs.reduce((s, d) => s + d.toks.length, 0) / Math.max(1, N);
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d.toks)) df.set(t, (df.get(t) ?? 0) + 1);

  // Questions about reasoning should surface the decision records first.
  const whyIntent = /\b(why|reason|rationale|decid|decision|chose|choose|chosen|select|alternative|reject|instead)/i.test(query);
  const typeBoost: Record<string, number> = { decision: whyIntent ? 2.2 : 1.25, revision: 1.1, note: 1.05 };
  const scored: Retrieved[] = docs.map(({ c, toks }) => {
    const tf = new Map<string, number>();
    for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    for (const term of q) {
      const f = tf.get(term);
      if (!f) continue;
      const idf = Math.log(1 + (N - (df.get(term) ?? 0) + 0.5) / ((df.get(term) ?? 0) + 0.5));
      score += idf * ((f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (toks.length / avg))));
    }
    return { chunk: c, score: score * (typeBoost[c.type] ?? 1) };
  });

  const picked = new Map<string, Retrieved>();
  scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, k).forEach((s) => picked.set(s.chunk.id, s));

  const force = (pred: (c: Chunk) => boolean) =>
    scored.filter((s) => pred(s.chunk)).forEach((s) => { if (!picked.has(s.chunk.id)) picked.set(s.chunk.id, { ...s, forced: true }); });
  const ql = query.toLowerCase();
  if (/(next|unresolved|open (issue|problem)|still|remaining|todo|to do|work on|biggest|problem|issue|gap|missing|undocumented)/.test(ql)) {
    force((c) => c.type === "note" && /UNRESOLVED ISSUE|RECOMMENDED NEXT STEP/.test(c.text) && /status: open/.test(c.text));
    force((c) => c.type === "review" && /\| open|status: (changes_requested|pending|in_review)/.test(c.text));
    force((c) => c.type === "decision" && /DOCUMENTATION GAP|status: proposed/.test(c.text));
  }
  if (/(lesson|learn|fail|mistake|went wrong|crack|broke)/.test(ql)) force((c) => c.type === "note" && /LESSON LEARNED/.test(c.text));
  if (/(revision|rev\b|version|between|history|evolv|timeline|iteration|changed)/.test(ql)) force((c) => c.type === "timeline");
  // Explicit revision labels ("revision A", "rev B.1") pin those revision records.
  for (const m of ql.matchAll(/\brev(?:ision)?\s+([a-z0-9][a-z0-9.]*)/g)) {
    const label = m[1].replace(/\.$/, "");
    force((c) => c.type === "revision" && (c.title.toLowerCase().startsWith(`revision rev ${label}:`) || c.title.toLowerCase().startsWith(`revision ${label}:`)));
  }
  if (/(what is|what was|overview|background|goal|trying|purpose|summary)/.test(ql)) force((c) => c.type === "project" || /BACKGROUND/.test(c.text));
  if (!picked.has("project:" + chunks.find((c) => c.type === "project")?.refId)) {
    const p = scored.find((s) => s.chunk.type === "project");
    if (p) picked.set(p.chunk.id, { ...p, forced: true });
  }
  return [...picked.values()].sort((a, b) => b.score - a.score).slice(0, k + 12);
}

/** True when nothing in the project matched the question at all (only the background chunk is present). */
export const nothingRelevant = (r: Retrieved[]) => r.every((x) => x.score === 0);
