import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type {
  AdminImport,
  AdminApiResponse,
  CreateImportPayload,
  UpdateImportPayload,
  ImportStatus,
} from "@/types/admin";

export async function listImports(filters?: {
  status?: ImportStatus;
  source_id?: string;
}): Promise<AdminApiResponse<AdminImport[]>> {
  const admin = createAdminSupabase();

  let query = admin
    .from("admin_imports")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.source_id) {
    query = query.eq("source_id", filters.source_id);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data as AdminImport[]) || [] };
}

export async function getImport(
  id: string
): Promise<AdminApiResponse<AdminImport>> {
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("admin_imports")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as AdminImport };
}

export async function createImport(
  payload: CreateImportPayload
): Promise<AdminApiResponse<AdminImport>> {
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("admin_imports")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as AdminImport };
}

export async function updateImport(
  id: string,
  payload: UpdateImportPayload
): Promise<AdminApiResponse<AdminImport>> {
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("admin_imports")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as AdminImport };
}

export async function updateImportStatus(
  id: string,
  status: ImportStatus,
  errorMessage?: string
): Promise<AdminApiResponse<AdminImport>> {
  return updateImport(id, {
    status,
    ...(errorMessage ? { error_message: errorMessage } : {}),
  });
}

export async function deleteImport(
  id: string
): Promise<AdminApiResponse<{ id: string }>> {
  const admin = createAdminSupabase();

  const { error } = await admin.from("admin_imports").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: { id } };
}
