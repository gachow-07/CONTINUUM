import { redirect } from "next/navigation";

// Subsystems are now "Components" on the project hub.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/projects/${id}?tab=components`);
}
