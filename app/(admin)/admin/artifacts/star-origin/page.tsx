import { notFound } from "next/navigation";

import { StarOriginWorkflowConsole } from "@/components/artifacts/StarOriginWorkflowConsole";
import {
  isLocalArtifactWorkflowEnabled,
  isLocalRealArtifactIntakeEnabled,
} from "@/lib/artifacts/fulfillment/availability";
import { listStarOriginWorkflowRecords } from "@/lib/artifacts/star-origin/workflow";

export const dynamic = "force-dynamic";

export default function StarOriginWorkflowPage() {
  if (!isLocalArtifactWorkflowEnabled()) notFound();
  return (
    <StarOriginWorkflowConsole
      initialReports={listStarOriginWorkflowRecords()}
      realIntakeEnabled={isLocalRealArtifactIntakeEnabled()}
    />
  );
}
