import { createClient } from "@supabase/supabase-js";

// Clés publiques (protégées par les règles RLS côté base) : sans danger dans le dépôt.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gxopzeiigbqhdopztsgv.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_KEY || "sb_publishable_PuCqto4auWV1PLgSdp0Lcg_ykrKIEKg";

export const supabase = createClient(url, key);
