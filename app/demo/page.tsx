import { Workspace } from "@/components/cad/workspace";

export const metadata = { title: "3D Workspace Demo" };

// Public, data-free demo: opens straight into the sample assembly so the workspace can be explored without an account.
export default function DemoPage() {
  return <Workspace project={null} initialParts={null} knowledge={null} aiEnabled={false} chat={null} />;
}
