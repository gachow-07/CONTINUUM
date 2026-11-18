"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubsystemDialog } from "@/components/views/subsystems-view";
import { useProjectPermissions } from "@/components/shell/project-permissions";

export function AddComponentButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const { canWrite } = useProjectPermissions();
  if (!canWrite(projectId)) return null;
  return (<><Button variant="accent" size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Add subsystem</Button>{open && <SubsystemDialog projectId={projectId} onClose={() => setOpen(false)} />}</>);
}
