import "server-only";

import { currentUser } from "@clerk/nextjs/server";

import {
  isArtifactWorkflowEnabled,
  isLocalArtifactWorkflowEnabled,
} from "./availability.ts";

export class ArtifactAdminAccessError extends Error {
  readonly status: 403 | 404;

  constructor(status: 403 | 404, message: string) {
    super(message);
    this.name = "ArtifactAdminAccessError";
    this.status = status;
  }
}

async function requireAdmin(
  available: boolean,
): Promise<{ actorId: string }> {
  if (!available) {
    throw new ArtifactAdminAccessError(404, "Artifact workflow not available.");
  }

  const user = await currentUser();
  if (!user || user.publicMetadata?.isAdmin !== true) {
    throw new ArtifactAdminAccessError(403, "Forbidden");
  }

  return { actorId: `clerk:${user.id}` };
}

export function requireArtifactAdmin(): Promise<{ actorId: string }> {
  return requireAdmin(isArtifactWorkflowEnabled());
}

export function requireLocalArtifactAdmin(): Promise<{ actorId: string }> {
  return requireAdmin(isLocalArtifactWorkflowEnabled());
}
