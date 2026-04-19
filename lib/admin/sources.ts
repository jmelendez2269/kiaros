import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type {
  AdminSource,
  AdminApiResponse,
  CreateSourcePayload,
  UpdateSourcePayload,
  SourceType,
} from "@/types/admin";

export async function listSources(filters?: {
  active?: boolean;
  source_type?: SourceType;
}): Promise<AdminApiResponse<AdminSource[]>> {
  const admin = createAdminSupabase();

  let query = admin
    .from("admin_sources")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.active !== undefined) {
    query = query.eq("active", filters.active);
  }

  if (filters?.source_type) {
    query = query.eq("source_type", filters.source_type);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data as AdminSource[]) || [] };
}

export async function getSource(
  id: string
): Promise<AdminApiResponse<AdminSource>> {
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("admin_sources")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as AdminSource };
}

export async function createSource(
  payload: CreateSourcePayload
): Promise<AdminApiResponse<AdminSource>> {
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("admin_sources")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as AdminSource };
}

export async function updateSource(
  id: string,
  payload: UpdateSourcePayload
): Promise<AdminApiResponse<AdminSource>> {
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("admin_sources")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as AdminSource };
}

export async function deleteSource(
  id: string
): Promise<AdminApiResponse<{ id: string }>> {
  const admin = createAdminSupabase();

  const { error } = await admin.from("admin_sources").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: { id } };
}
