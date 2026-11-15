/** Re-mounts on every project sub-page change, so each section (Research, Decisions, Reviews…) eases in below the persistent project header. */
export default function ProjectSectionTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
