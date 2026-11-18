"use client";
import { createContext, useContext } from "react";
import type { MemberRole } from "@/lib/types";

type ProjectRole = { project_id: string; role: MemberRole };
const ProjectPermissions = createContext<ProjectRole[] | null>(null);

export function ProjectPermissionsProvider({ roles, children }: { roles: ProjectRole[]; children: React.ReactNode }) {
  return <ProjectPermissions.Provider value={roles}>{children}</ProjectPermissions.Provider>;
}

/** No provider is used by the standalone local demo. */
export function useProjectPermissions() {
  const roles = useContext(ProjectPermissions);
  return {
    canWrite: (id: string) => roles === null || roles.some((role) => role.project_id === id && (role.role === "owner" || role.role === "editor")),
    canOwn: (id: string) => roles === null || roles.some((role) => role.project_id === id && role.role === "owner"),
  };
}
