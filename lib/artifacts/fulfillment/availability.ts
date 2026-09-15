import "server-only";

import {
  isEtsyArtifactAdminEnabled,
  isEtsyArtifactPersistenceEnabled,
  isEtsyArtifactRealIntakeEnabled,
} from "../../feature-flags.ts";

export function isArtifactWorkflowEnabled(): boolean {
  return isEtsyArtifactAdminEnabled()
    && (process.env.NODE_ENV !== "production" || isEtsyArtifactPersistenceEnabled());
}

export function isRealArtifactIntakeEnabled(): boolean {
  return isArtifactWorkflowEnabled()
    && isEtsyArtifactPersistenceEnabled()
    && isEtsyArtifactRealIntakeEnabled();
}

export function isLocalArtifactWorkflowEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && isEtsyArtifactAdminEnabled();
}

export function isLocalRealArtifactIntakeEnabled(): boolean {
  return isLocalArtifactWorkflowEnabled()
    && isEtsyArtifactPersistenceEnabled()
    && isEtsyArtifactRealIntakeEnabled();
}
