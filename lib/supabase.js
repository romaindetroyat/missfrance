import { createClient } from "@supabase/supabase-js";

// Projet Supabase « miss-france-2027 ». Adresse et clé publiques, protégées par les règles RLS :
// volontairement fixées ici pour ne pas dépendre des variables injectées par l'intégration Vercel.
const url = "https://gxopzeiigbqhdopztsgv.supabase.co";
const key = "sb_publishable_PuCqto4auWV1PLgSdp0Lcg_ykrKIEKg";

export const supabase = createClient(url, key);
