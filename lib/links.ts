// Deep links into the app for a given piece of project knowledge (used by citations, timelines, evidence chips).
export function refHref(projectId: string, type: string, id: string): string {
  switch (type) {
    case "decision": return `/projects/${projectId}/decisions?open=${id}`;
    case "research": return `/projects/${projectId}/research?open=${id}`;
    case "revision": return `/projects/${projectId}/history?open=${id}`;
    case "file": return `/projects/${projectId}/files?open=${id}`;
    case "review": return `/projects/${projectId}/reviews?open=${id}`;
    case "comment": return `/projects/${projectId}/reviews`;
    case "note": return `/projects/${projectId}/handoff#notes`;
    case "document": return `/projects/${projectId}/docs?open=${id}`;
    case "subsystem": return `/projects/${projectId}/components/${id}`;
    default: return `/projects/${projectId}`;
  }
}
