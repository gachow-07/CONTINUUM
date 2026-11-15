"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubsystemDialog } from "@/components/views/subsystems-view";

export function AddComponentButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  return (<><Button variant="accent" size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Add subsystem</Button>{open && <SubsystemDialog projectId={projectId} onClose={() => setOpen(false)} />}</>);
}
