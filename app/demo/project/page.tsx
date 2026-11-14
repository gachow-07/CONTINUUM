import Link from "next/link";
import { AssemblyViewer, type HubComponent } from "@/components/hub/assembly-viewer";
import { Card, CardHeader } from "@/components/ui/card";
import { createSampleAssembly, SAMPLE_MARKERS } from "@/lib/cad/sample";

export const metadata = { title: "Sample Project Hub" };

export default function DemoProject() {
  const parts = createSampleAssembly().map((part) => part.subsystemName === "Suspension" ? { ...part, subsystemId: "suspension" } : part);
  const components: HubComponent[] = [{
    id: "suspension", name: "Suspension", marker: SAMPLE_MARKERS.Suspension,
    done: 5, total: 6, statusLabel: "Review pending", statusTone: "accent",
    latestDecision: { id: "sample-suspension", title: "Double-wishbone geometry selected", href: "/demo/project/suspension#decision" },
    reviewLabel: "Review pending", reviewTone: "accent", href: "/demo/project/suspension",
  }];
  return (
    <main className="mx-auto max-w-[1320px] space-y-6 px-4 py-6 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm"><span><strong>Sample project preview.</strong> Illustrative data; changes aren’t saved.</span><Link href="/demo/home" className="font-medium text-accent hover:underline">← Homepage</Link></div>
      <div><p className="text-xs text-muted-foreground">Projects / RC Car Design</p><h1 className="mt-2 text-2xl font-semibold">RC Car Design <span className="ml-2 rounded bg-accent-soft px-2 py-1 align-middle text-xs font-medium text-accent">Sample project</span></h1><p className="mt-2 text-sm text-muted-foreground">Select the Suspension marker on the car, or use the List button to open it.</p></div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5"><AssemblyViewer projectId="sample" parts={parts} components={components} revisionLabel="Rev B" placeholder /><Card><CardHeader title="Living design summary" description="Illustrative sample decision" /><div className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"><span>Suspension · Double-wishbone geometry selected</span><Link href="/demo/project/suspension#decision" className="text-accent hover:underline">View decision →</Link></div></Card></div>
        <div className="space-y-5"><Card><CardHeader title="Documentation readiness" /><div className="space-y-3 p-4 text-sm"><p>Suspension <span className="float-right text-muted-foreground">5 / 6 complete</span></p><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-5/6 rounded-full bg-accent" /></div><p className="text-xs text-muted-foreground">Illustrative status. Documentation readiness is not engineering approval.</p><Link className="inline-block text-accent hover:underline" href="/demo/project/suspension">Open suspension →</Link></div></Card><Card><CardHeader title="Needs attention" /><p className="p-4 text-sm text-muted-foreground">Review ball-joint pocket strength.</p></Card><Link href="/demo" className="inline-block text-sm text-accent hover:underline">Open the 3D editor →</Link></div>
      </div>
    </main>
  );
}
