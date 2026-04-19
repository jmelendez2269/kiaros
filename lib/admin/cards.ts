import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type {
  AdminCard,
  AdminApiResponse,
  CreateCardPayload,
  UpdateCardPayload,
  CardStatus,
  CardCategory,
} from "@/types/admin";

export async function listCards(filters?: {
  status?: CardStatus;
  category?: CardCategory;
  import_id?: string;
}): Promise<AdminApiResponse<AdminCard[]>> {
  const admin = createAdminSupabase();

  let query = admin
    .from("admin_cards")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  if (filters?.import_id) {
    query = query.eq("import_id", filters.import_id);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data as AdminCard[]) || [] };
}

export async function getCard(
  id: string
): Promise<AdminApiResponse<AdminCard>> {
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("admin_cards")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as AdminCard };
}

export async function createCard(
  payload: CreateCardPayload
): Promise<AdminApiResponse<AdminCard>> {
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("admin_cards")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as AdminCard };
}

export async function updateCard(
  id: string,
  payload: UpdateCardPayload
): Promise<AdminApiResponse<AdminCard>> {
  const admin = createAdminSupabase();

  const { data, error } = await admin
    .from("admin_cards")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as AdminCard };
}

export async function approveCard(
  id: string
): Promise<AdminApiResponse<AdminCard>> {
  return updateCard(id, { status: "approved" });
}

export async function rejectCard(
  id: string
): Promise<AdminApiResponse<AdminCard>> {
  return updateCard(id, { status: "rejected" });
}

export async function deleteCard(
  id: string
): Promise<AdminApiResponse<{ id: string }>> {
  const admin = createAdminSupabase();

  const { error } = await admin.from("admin_cards").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: { id } };
}
