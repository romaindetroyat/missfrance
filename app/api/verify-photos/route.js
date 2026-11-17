// Vérification automatique des photos par un modèle de vision (Claude via la passerelle IA de Vercel).
// Pour chaque photo en attente : comparaison avec le portrait officiel de la candidate, présence d'autres
// personnes, catégorie. Seules les photos validées s'affichent sur le site.
// Appelé chaque minute par Supabase (pg_cron) avec la clé de revue.
import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Modèle de vision : clé Anthropic ou Google si fournie dans les variables Vercel, sinon passerelle IA Vercel.
function pickModel(forced) {
  if (forced) return { model: forced, via: "gateway:" + forced };
  if (process.env.ANTHROPIC_API_KEY) return { model: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })("claude-haiku-5-5"), via: "anthropic" };
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) return { model: createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })("gemini-2.5-flash"), via: "google" };
  return { model: "anthropic/claude-haiku-5.5", via: "gateway" };
}
const BATCH = 24;
const PARALLEL = Number(process.env.VERIFY_PARALLEL || 8);

const Verdict = z.object({
  same_person: z.enum(["oui", "non", "incertain"]).describe("La personne principale de la photo 2 est-elle la même que sur le portrait officiel (photo 1) ?"),
  main_subject: z.boolean().describe("Cette personne est-elle le sujet principal, bien visible (pas une silhouette lointaine dans un groupe) ?"),
  others: z.enum(["aucun", "secondaires", "dominants"]).describe("Autres personnes : aucune, en second plan, ou au premier plan / aussi importantes"),
  category: z.enum(["officiel", "election", "maillot", "voyage", "autre"]),
  usable: z.boolean().describe("Photo exploitable : nette, pas un montage, pas une capture d'écran de texte, pas un logo"),
  reason: z.string().describe("Une phrase courte en français"),
});

const PROMPT = (nom, region) => `Tu vérifies les photos d'une candidate à Miss France 2027 : ${nom}.
Elle a été élue Miss ${region} 2026 (élection régionale de 2026, qualificative pour Miss France 2027) :
une écharpe « Miss ${region} 2026 » ou « ${region} 2026 » est donc NORMALE et correspond à elle.
Une écharpe d'une autre année (2025, 2024…) ou d'une autre région désigne une autre Miss.
Photo 1 : son portrait officiel (référence). Photo 2 : photo trouvée sur internet.
Compare les visages (traits, forme du visage, sourcils, nez, bouche), pas seulement la coiffure ou la tenue :
le maquillage, la coiffure et l'éclairage changent beaucoup d'une photo à l'autre, ne conclus pas « non » pour ces seules raisons.
Réponds "non" si la photo 2 montre un homme, un enfant, une autre Miss (autre année ou autre région), une dauphine, un membre du comité, une autre célébrité, ou si la candidate n'y est pas.
Réponds "incertain" si le visage est trop petit, caché ou flou pour conclure.
Catégorie de la photo 2 :
- officiel : portrait officiel ou photo studio normée de la candidate (fond uni, pose face caméra) ;
- election : soirée d'élection régionale, robe de soirée avec écharpe ou couronne ;
- maillot : en maillot de bain ;
- voyage : voyage de préparation Miss France (plage, séance photo de groupe des Miss 2027) ;
- autre : tout le reste (vie quotidienne, presse, événements).`;

export async function GET(req) {
  const params = new URL(req.url).searchParams;
  const key = params.get("key") || "";
  const forced = /^[a-z0-9-]+\/[a-z0-9.\-]+$/i.test(params.get("model") || "") ? params.get("model") : process.env.VERIFY_MODEL || null;
  const sb = createClient("https://gxopzeiigbqhdopztsgv.supabase.co", "sb_publishable_PuCqto4auWV1PLgSdp0Lcg_ykrKIEKg");
  const { data: batch, error } = await sb.rpc("review_next", { p_key: key, p_limit: BATCH });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!batch?.length) return Response.json({ done: true });

  const { model, via } = pickModel(forced);
  const out = { via, hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY, ok: 0, rejected: 0, errors: [] };
  const t0 = Date.now();
  async function one(p) {
    if (!p.ref_url) return;
    try {
      const { object: v } = await generateObject({
        model,
        schema: Verdict,
        maxRetries: 1,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: PROMPT(p.nom, p.region) },
            { type: "image", image: new URL(p.ref_url) },
            { type: "image", image: new URL(p.url) },
          ],
        }],
      });
      const ok = v.same_person === "oui" && v.main_subject && v.others !== "dominants" && v.usable;
      await sb.rpc("review_set", { p_key: key, p_id: p.id, p_ok: ok, p_type: v.category, p_note: `${v.same_person} · ${v.others} · ${v.reason}` });
      ok ? out.ok++ : out.rejected++;
    } catch (e) {
      const msg = String(e?.message || e);
      out.errors.push(msg.slice(0, 160));
      // Image illisible ou introuvable : la photo est écartée
      if (/image|download|fetch|media|invalid|unsupported/i.test(msg)) {
        await sb.rpc("review_set", { p_key: key, p_id: p.id, p_ok: false, p_type: null, p_note: "image illisible : " + msg.slice(0, 120) });
      }
    }
  }
  for (let i = 0; i < batch.length && Date.now() - t0 < 45000; i += PARALLEL) {
    await Promise.all(batch.slice(i, i + PARALLEL).map(one));
  }
  return Response.json({ ...out, ms: Date.now() - t0 });
}
