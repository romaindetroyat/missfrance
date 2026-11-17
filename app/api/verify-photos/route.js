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
  content: z.enum(["candidate", "lieu_paysage", "nourriture_objet", "texte_graphique", "autre"]).describe("Ce que montre la photo 2 : une personne (candidate), un lieu ou paysage sans personne au premier plan, un plat ou un objet, du texte / affiche / capture d'écran, autre chose"),
  same_person: z.enum(["oui", "non", "incertain"]).describe("La personne principale de la photo 2 est-elle la même que sur le portrait officiel (photo 1) ?"),
  main_subject: z.boolean().describe("Cette personne est-elle le sujet principal, bien visible (pas une silhouette lointaine) ?"),
  others: z.enum(["aucun", "arriere_plan", "accompagnee"]).describe("Autres personnes : aucune ; seulement au loin / floues en arrière-plan ; ou bien posant avec elle ou au premier plan (amis, famille, autres Miss, groupe)"),
  sharp: z.boolean().describe("Photo nette (pas floue, pas bougée, pas trop sombre ni pixelisée)"),
  well_framed: z.boolean().describe("Bien cadrée : la candidate est entière ou coupée proprement (visage complet, pas tête coupée, pas de cadrage de travers ou de gros plan sur un détail)"),
  face_visible: z.boolean().describe("Son visage est visible (même de trois quarts, avec des lunettes de soleil ou de loin), pas caché ni de dos"),
  own_sash: z.boolean().describe("Elle porte une écharpe de SA région et de 2026 (Miss <sa région> 2026)"),
  category: z.enum(["officiel", "portrait", "election", "maillot", "voyage", "autre"]),
  reason: z.string().describe("Une phrase courte en français"),
});

const PROMPT = (nom, region) => `Tu tries les photos d'une candidate à Miss France 2027 : ${nom}, Miss ${region} 2026.
On ne garde QUE les photos où l'on voit bien la candidate, seule, nette et bien cadrée.
Une écharpe « Miss ${region} 2026 » ou « ${region} 2026 » est NORMALE et correspond à elle ; une écharpe d'une autre année ou d'une autre région désigne une autre Miss.
Photo 1 : son portrait officiel (référence). Photo 2 : photo à trier.
Compare les visages (traits, forme du visage, sourcils, nez, bouche), pas la coiffure, le maquillage ou la tenue.
same_person = "non" si la photo 2 montre un homme, un enfant, une autre femme, une autre Miss, ou si la candidate n'y est pas ; "incertain" si le visage est trop petit, caché ou de dos.
Une photo en maillot (allongée, de profil, avec lunettes de soleil) n'est pas « mal cadrée » pour autant : juge le cadrage normalement.
À écarter : lieux, paysages, plats, objets, textes, captures d'écran ; photos avec ses amis, sa famille ou d'autres personnes posant avec elle ; photos floues, sombres, pixelisées, mal cadrées.
Catégorie de la photo 2 :
- officiel : portrait officiel ou photo studio normée (fond uni, pose face caméra) ;
- portrait : photo centrée sur son visage ou son buste, posée et soignée (hors studio officiel) ;
- maillot : en maillot de bain ou bikini (plage, piscine, défilé ou séance photo en maillot) ;
- election : soirée d'élection régionale, robe de soirée avec écharpe ou couronne ;
- voyage : voyage de préparation Miss France 2027 ;
- autre : le reste (en pied, tenue de ville, événements…).`;

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
            // Photos du Drive : version allégée pour l'analyse
            { type: "image", image: new URL(p.url.startsWith("https://lh3.googleusercontent.com/") ? p.url.replace(/=[^=/]*$/, "=w768") : p.url) },
          ],
        }],
      });
      // Photos du Drive : elles viennent de son propre compte Instagram, un « incertain » seule à l'image suffit
      const fromOwnAccount = p.url.startsWith("https://lh3.googleusercontent.com/");
      const isHer = v.same_person === "oui" || (fromOwnAccount && v.same_person === "incertain" && v.others === "aucun");
      let ok = v.content === "candidate" && isHer && v.main_subject && v.others !== "accompagnee" && v.sharp && v.well_framed;
      // Maillot : rubrique recherchée, les poses (allongée, de profil, lunettes) rendent le visage moins sûr.
      // Sur son propre compte, on garde dès qu'elle est seule, nette et visage visible, même si le modèle doute
      // de l'identité (choix du propriétaire du site) ; ailleurs, il faut « oui » ou l'écharpe de sa région 2026.
      if (!ok && v.category === "maillot" && v.content === "candidate" && v.sharp && v.face_visible && v.others !== "accompagnee"
        && (v.same_person === "oui" || v.own_sash || fromOwnAccount)) ok = true;
      const flags = [v.content !== "candidate" && v.content, !v.sharp && "floue", !v.well_framed && "mal cadrée", !v.face_visible && "visage caché", v.own_sash && "écharpe 2026"].filter(Boolean).join(", ");
      await sb.rpc("review_set", { p_key: key, p_id: p.id, p_ok: ok, p_type: v.category, p_note: `${v.same_person} · ${v.others}${flags ? " · " + flags : ""} · ${v.category} · ${v.reason}` });
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
