import "server-only";

import { MemoryArtifactWorkflowRepository } from "./memory-repository.ts";

type ArtifactWorkflowGlobal = typeof globalThis & {
  __kiarosArtifactWorkflowStore?: MemoryArtifactWorkflowRepository;
};

const workflowGlobal = globalThis as ArtifactWorkflowGlobal;

export function getLocalArtifactWorkflowStore(): MemoryArtifactWorkflowRepository {
  workflowGlobal.__kiarosArtifactWorkflowStore ??= new MemoryArtifactWorkflowRepository(true);
  return workflowGlobal.__kiarosArtifactWorkflowStore;
}
