"use client";
import type { DocSection } from "./types";

/** Renders a document to a real PDF in the browser (jsPDF) — text, headings, bullets, status labels and a source list. */
export async function exportDocPdf(opts: { title: string; projectName: string; sections: DocSection[]; typeLabel: string; sourceTitles: Map<string, string> }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 56;
  const maxW = W - M * 2;
  let y = M;
  const ensure = (h: number) => { if (y + h > H - M) { doc.addPage(); y = M; } };
  const para = (text: string, size = 10.5, color: [number, number, number] = [29, 36, 51], indent = 0, lh = 1.45) => {
    doc.setFontSize(size); doc.setTextColor(...color);
    for (const line of doc.splitTextToSize(text, maxW - indent) as string[]) { ensure(size * lh); doc.text(line, M + indent, y); y += size * lh; }
  };

  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(37, 99, 255);
  doc.text(opts.typeLabel.toUpperCase(), M, y); y += 20;
  doc.setFontSize(20); doc.setTextColor(15, 22, 35);
  for (const line of doc.splitTextToSize(opts.title, maxW) as string[]) { doc.text(line, M, y); y += 25; }
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(102, 112, 133);
  doc.text(`${opts.projectName} · Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} with Project Memory`, M, y); y += 12;
  doc.setDrawColor(228, 231, 236); doc.line(M, y, W - M, y); y += 22;

  const label: Record<DocSection["status"], string> = { confirmed: "Documented", partial: "Partially documented", missing: "Not documented" };
  for (const s of opts.sections) {
    ensure(60);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(15, 22, 35); doc.text(s.title, M, y); y += 8;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    const [r, g, b] = s.status === "confirmed" ? [47, 133, 90] : s.status === "partial" ? [183, 121, 31] : [192, 57, 43];
    doc.setTextColor(r, g, b);
    y += 6; doc.text(label[s.status].toUpperCase(), M, y); y += 14;
    doc.setFont("helvetica", "normal");
    for (const block of s.content.split(/\n+/)) {
      const t = block.trim(); if (!t) continue;
      if (/^[-•*]\s+/.test(t)) { ensure(14); doc.setFontSize(10.5); doc.setTextColor(29, 36, 51); doc.text("•", M + 4, y); para(t.replace(/^[-•*]\s+/, ""), 10.5, [29, 36, 51], 16); y += 2; }
      else if (/^not documented:/i.test(t)) { para(t, 10.5, [183, 121, 31]); y += 3; }
      else { para(t); y += 4; }
    }
    if (s.sources.length) { const names = s.sources.map((id) => opts.sourceTitles.get(id)).filter(Boolean).join("; "); if (names) para(`Sources: ${names}`, 8.5, [102, 112, 133]); }
    y += 14;
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(152, 162, 179); doc.text(`Project Memory · ${opts.projectName}`, M, H - 28); doc.text(`${i} / ${pages}`, W - M, H - 28, { align: "right" }); }
  doc.save(`${opts.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "document"}.pdf`);
}
