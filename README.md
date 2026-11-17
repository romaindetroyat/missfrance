# Miss France 2027 — pronostics entre amis

Site privé : chaque invité compose son Top 5 dans l'ordre, modifiable jusqu'à 2 heures avant la cérémonie (12 décembre 2026).

- `app/`, `components/`, `lib/` : site Next.js (déployé sur Vercel).
- `supabase/` : schéma de la base (joueurs, candidates, photos, pronostics) et règles d'accès.
- `data/candidates.json`, `data/profiles.json` : fiches des 31 candidates.
- `data/historique/` : Miss France 2010-2026 (531 candidates), source Wikipédia.
- `model/model.py` : modèle statistique. `python3 model/model.py` régénère `data/model/*.json` (probabilités, cotes, validation).

Barème : candidate présente dans le Top 5 réel = 10 × cote ; rang exact = ×2 ; gagnante trouvée en n° 1 = ×3.
