"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { initializeSampleProject } from "@/app/actions/projects";

export function SampleOnboarding({ pending }: { pending: boolean }) {
  const started = useRef(false);
  const router = useRouter();
  useEffect(() => {
    if (!pending || started.current) return;
    started.current = true;
    // Coordinate tabs where supported so two first-loads don't create duplicate samples.
    const setup = async () => {
      if (navigator.locks) return await navigator.locks.request("continuum-sample-onboarding", async () => await initializeSampleProject());
      return await initializeSampleProject();
    };
    void setup().then((result) => {
      if (result.ok) { toast.success("Your sample RC Car Design project is ready."); router.refresh(); }
      else toast.error("Could not set up the sample project. You can retry by refreshing the page.");
    }).catch(() => toast.error("Could not set up the sample project. You can retry by refreshing the page."));
  }, [pending, router]);
  return null;
}
