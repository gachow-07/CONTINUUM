import { redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ id: string; sid: string }> }) {
  const { id, sid } = await params;
  redirect(`/projects/${id}/components/${sid}`);
}
