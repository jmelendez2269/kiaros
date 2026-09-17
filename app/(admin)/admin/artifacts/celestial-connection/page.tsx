import { notFound } from "next/navigation";

import { CelestialConnectionWorkflowConsole } from "@/components/artifacts/CelestialConnectionWorkflowConsole";
import { isLocalArtifactWorkflowEnabled, isLocalRealArtifactIntakeEnabled } from "@/lib/artifacts/fulfillment/availability";
import { listCelestialConnectionWorkflowRecords } from "@/lib/artifacts/celestial-connection/workflow";

export const dynamic = "force-dynamic";
export default function CelestialConnectionWorkflowPage() {
  if (!isLocalArtifactWorkflowEnabled()) notFound();
  return <CelestialConnectionWorkflowConsole initialReports={listCelestialConnectionWorkflowRecords()} realIntakeEnabled={isLocalRealArtifactIntakeEnabled()} />;
}
