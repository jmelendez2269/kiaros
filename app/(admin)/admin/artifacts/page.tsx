import { notFound } from "next/navigation";

import { ArtifactWorkflowConsole } from "@/components/artifacts/ArtifactWorkflowConsole";
import {
  isArtifactWorkflowEnabled,
  isLocalArtifactWorkflowEnabled,
  isRealArtifactIntakeEnabled,
} from "@/lib/artifacts/fulfillment/availability";
import { getArtifactWorkflowRepository } from "@/lib/artifacts/fulfillment/repository";

export const dynamic = "force-dynamic";

export default async function ArtifactWorkflowPage() {
  if (!isArtifactWorkflowEnabled()) notFound();

  const { mode, repository } = getArtifactWorkflowRepository();

  return (
    <ArtifactWorkflowConsole
      initialOrders={await repository.list()}
      experimentalToolsEnabled={isLocalArtifactWorkflowEnabled()}
      persistenceMode={mode}
      realIntakeEnabled={isRealArtifactIntakeEnabled()}
    />
  );
}
