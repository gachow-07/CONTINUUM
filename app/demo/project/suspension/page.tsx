import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";

export const metadata = { title: "Sample Suspension" };

export default function DemoSuspension() {
  return (
    <main className="mx-auto max-w-[1100px] space-y-6 px-4 py-6 sm:px-8">
      <div className="rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm"><strong>Sample component.</strong> This is an illustrative story, not verified engineering data. No changes are saved.</div>
      <div><Link href="/demo/project" className="text-sm text-accent hover:underline">← Back to project hub</Link><h1 className="mt-4 text-2xl font-semibold">Suspension</h1><p className="mt-1 text-sm text-muted-foreground">Front and rear suspension: arms, shocks, springs, and geometry.</p></div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5"><Card id="decision"><CardHeader title="Why this design?" description="Sample decision" /><div className="space-y-3 p-5 text-sm leading-relaxed"><h2 className="font-semibold">Double-wishbone geometry selected</h2><p>The sample team considered this layout to improve wheel contact during cornering after the earlier design showed excessive body roll. This explanation is illustrative.</p><p className="text-muted-foreground">Alternatives included stiffer springs, an anti-roll bar, and a multi-link suspension. No simulation or instrumented measurement is documented for this sample decision.</p></div></Card><Card><CardHeader title="Research and revisions" /><div className="space-y-3 p-5 text-sm"><p><span className="font-medium">Sample research:</span> Suspension Geometry Optimization</p><p className="text-muted-foreground">Illustrative source text describes how wishbone geometry can affect wheel angle during body roll. It is not a real paper.</p><p><span className="font-medium">Revision B.1:</span> A mounting spacer was added in response to a sample clearance review.</p></div></Card></div>
        <div className="space-y-5"><Card><CardHeader title="Documentation checklist" /><ul className="space-y-2 p-5 text-sm">{["Design described", "Choices explained", "Alternatives recorded", "Sources attached", "Revision explained"].map((item) => <li key={item} className="text-foreground">✓ {item}</li>)}<li className="text-warning">○ Review completed</li></ul><p className="border-t border-border p-4 text-xs text-muted-foreground">Sample documentation status; not engineering approval.</p></Card><Card><CardHeader title="Open issue" /><p className="p-4 text-sm">Review the strength of the ball-joint pocket on the suspension arms.</p></Card></div>
      </div>
    </main>
  );
}
