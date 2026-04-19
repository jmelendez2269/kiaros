import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type {
  AdminPlannerMapping,
  AdminApiResponse,
  CreateMappingPayload,
  UpdateMappingPayload,
  PlannerLayer,
} from "@/types/admin";

export async function listMappings(filters?: {
  card_id?: string;
  planner_layer?: PlannerLayer;
}): Promise<AdminApiResponse<AdminPlannerMapping[]>> {
  const admin = createAdminSupabase();

  let query = admin
    .from("admin_planner_mappings")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.card_id) {
    query = query.eq("card_id", filters.card_id);
  }

  if (filters?.planner_layer) {
    query = query.eq("planner_layer", filters.planner_layer);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data as AdminPlannerMapping[]) || [] };
}

export async function getMapping(
  id: string
): Promise<AdminApiResponse<AdminPlannerMapping>> {
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("admin_planner_mappings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as AdminPlannerMapping };
}

export async function createMapping(
  payload: CreateMappingPayload
): Promise<AdminApiResponse<AdminPlannerMapping>> {
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("admin_planner_mappings")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as AdminPlannerMapping };
}

export async function updateMapping(
  id: string,
  payload: UpdateMappingPayload
): Promise<AdminApiResponse<AdminPlannerMapping>> {
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("admin_planner_mappings")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as AdminPlannerMapping };
}

export async function deleteMapping(
  id: string
): Promise<AdminApiResponse<{ id: string }>> {
  const admin = createAdminSupabase();

  const { error } = await admin
    .from("admin_planner_mappings")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: { id } };
}
