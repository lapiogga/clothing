"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getDeliveryZones(storeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("delivery_zones")
    .select("*")
    .eq("store_id", storeId)
    .order("name");

  if (error) return { zones: [] };
  return { zones: data || [] };
}

export async function createDeliveryZone(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("delivery_zones").insert({
    store_id: formData.get("store_id") as string,
    name: formData.get("name") as string,
    address: formData.get("address") as string || null,
    note: formData.get("note") as string || null,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/store/delivery");
  return { success: true };
}

export async function updateDeliveryZone(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("delivery_zones")
    .update({
      name: formData.get("name") as string,
      address: formData.get("address") as string || null,
      note: formData.get("note") as string || null,
      is_active: formData.get("is_active") === "true",
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/store/delivery");
  return { success: true };
}

export async function deleteDeliveryZone(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/store/delivery");
  return { success: true };
}
