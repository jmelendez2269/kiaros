import { notFound } from "next/navigation";

import { YearAheadWorkflowConsole } from "@/components/artifacts/YearAheadWorkflowConsole";
import {
  isLocalArtifactWorkflowEnabled,
  isLocalRealArtifactIntakeEnabled,
} from "@/lib/artifacts/fulfillment/availability";
import { listYearAheadWorkflowRecords } from "@/lib/artifacts/year-ahead/workflow";

export const dynamic = "force-dynamic";

export default function YearAheadWorkflowPage() {
  if (!isLocalArtifactWorkflowEnabled()) notFound();
  return (
    <YearAheadWorkflowConsole
      initialReports={listYearAheadWorkflowRecords()}
      realIntakeEnabled={isLocalRealArtifactIntakeEnabled()}
    />
  );
}
