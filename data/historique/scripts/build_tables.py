#!/usr/bin/env python3
"""Construit contexte_editions.csv, regions.csv, candidates_2027.csv et nettoie editions.csv.
Usage : build_tables.py <dossier_wikitexte> <dossier_sortie>"""
import csv, re, sys, collections, importlib.util, io, contextlib
SRC, OUT = sys.argv[1], sys.argv[2]
sys.argv = [sys.argv[0], SRC, OUT]
spec = importlib.util.spec_from_file_location("pw", OUT + "/scripts/parse_wiki.py")
pw = importlib.util.module_from_spec(spec)
with contextlib.redirect_stderr(io.StringIO()):
    spec.loader.exec_module(pw)

CANON = {"Centre-Val-de-Loire": "Centre-Val de Loire", "Pays de Loire": "Pays de la Loire",
         "Guadeloupe et Îles du Nord": "Guadeloupe"}
rows = list(csv.DictReader(open(OUT + "/editions.csv", encoding="utf-8")))
for r in rows:
    r["nom"] = r["nom"].split("|")[-1].strip()
    r["region_normalisee"] = CANON.get(r["region"], r["region"])
    seen, ps = set(), []
    for p in r["prix_speciaux"].split(" | "):
        p = p.strip().replace("’", "'")
        k = pw.norm(p)
        if p and k not in seen and not any(k != s and s in k for s in seen):
            seen.add(k); ps.append(p)
    r["prix_speciaux"] = " | ".join(ps)
    mp = re.search(r"(\d+)(?:[.,](\d+))?", r["finale_pct_public"])
    r["finale_pct_public"] = (mp.group(1) + ("." + mp.group(2) if mp.group(2) else "")) if mp else ""
    r["prix_culture_generale"] = "oui" if "culture g" in r["prix_speciaux"].lower() else "non"
cols = ["edition", "region", "region_normalisee", "nom", "age", "taille_cm", "couleur_cheveux", "classement", "rang_precis",
        "prix_speciaux", "prix_culture_generale", "note_culture_generale", "region_hote", "demi_pts_public", "demi_pts_jury",
        "finale_pts_public", "finale_pts_jury", "finale_pct_public"]
with open(OUT + "/editions.csv", "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=cols); w.writeheader(); w.writerows(rows)

# ---------- contexte
PRES = {2010: "Arielle Dombasle", 2011: "Alain Delon", 2012: "Alain Delon", 2013: "Alain Delon", 2014: "Garou",
        2015: "Patrick Bruel", 2016: "Jean-Paul Gaultier", 2017: "Arielle Dombasle",
        2018: "Jean-Paul Gaultier et Iris Mittenaere (co-présidents)", 2019: "Line Renaud", 2020: "Amandine Henry",
        2021: "Iris Mittenaere", 2022: "Jean-Pierre Pernaut", 2023: "Francis Huster", 2024: "Sylvie Tellier",
        2025: "Sylvie Vartan", 2026: "Michèle Bernier"}
MOIS = "janvier février mars avril mai juin juillet août septembre octobre novembre décembre".split()
ctx = []
for y in range(2010, 2027):
    t = open(f"{SRC}/mf{y}.wiki", encoding="utf-8").read()
    m = re.search(r"\| *date *= *(.*)", t).group(1)
    m = re.sub(r"<ref.*", "", m)
    d = re.search(r"(\d{1,2})\D+?([A-Za-zéû]+|\d{1,2})\D+?(\d{4})", m)
    mo = d.group(2).lower()
    mo = int(mo) if mo.isdigit() else MOIS.index(mo) + 1
    date = f"{d.group(3)}-{mo:02d}-{int(d.group(1)):02d}"
    rr = [r for r in rows if r["edition"] == str(y)]
    nsemi = sum(r["classement"] != "non_classee" for r in rr)
    n_info = re.search(r"\| *candidates *= *(\d+)", t).group(1)
    final_rule = ("100 % public (vote des téléspectateurs seul, en pourcentage des voix)" if y <= 2020 else
                  "50 % public / 50 % jury (rangs convertis en points 5 à 1 ; égalité : le public prévaut)")
    hote = [r["region"] + " (" + r["classement"] + ")" for r in rr if r["region_hote"] == "oui"]
    ctx.append({
        "edition": y, "date": date, "ville_hote": pw.HOTE[y][0], "region_hote": pw.HOTE[y][1],
        "comite_regional_hote": "; ".join(r["region"] for r in rr if r["region_hote"] == "oui"),
        "classement_candidate_hote": "; ".join(r["classement"] for r in rr if r["region_hote"] == "oui"),
        "nb_candidates": len(rr), "nb_candidates_infobox": n_info, "nb_demi_finalistes": nsemi,
        "regle_preselection": f"{nsemi} demi-finalistes présélectionnées par un jury interne (société Miss France / partenaires) lors d'un entretien quelques jours avant la cérémonie (éloquence, physique, test de culture générale) ; 0 % public",
        "regle_demi_finale": f"50 % public / 50 % jury (rangs convertis en points {nsemi} à 1, addition ; égalité : le jury prévaut" + (")" if y <= 2021 else " — règle d'égalité non reprécisée sur la page de cette édition)"),
        "regle_finale": final_rule, "poids_public_demi": 0.5, "poids_jury_demi": 0.5,
        "poids_public_finale": 1.0 if y <= 2020 else 0.5, "poids_jury_finale": 0.0 if y <= 2020 else 0.5,
        "president_jury": PRES[y],
        "detail_votes_publie": "demi: points public+jury ; finale: " + ("% public" if y <= 2020 else "points public+jury"),
        "source": f"https://fr.wikipedia.org/wiki/Miss_France_{y}",
    })
with open(OUT + "/contexte_editions.csv", "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=list(ctx[0])); w.writeheader(); w.writerows(ctx)

# ---------- regions
mf = open(f"{SRC}/mf.wiki", encoding="utf-8").read()
sec = pw.section(mf, "Palmarès par comité")
hist = {}
cur_n = None
for r in pw.rows(pw.tables(sec)[0])[1:]:
    cells = [pw.clean(re.sub(r"\{\{gris\|([^}]*)\}\}", r"\1", re.sub(r"<sup>.*?</sup>", "", c[1]))) for c in r]
    # lignes : [rang, comité, victoires, années] ou [comité, années] (rowspan)
    nums = [c for c in cells if re.fullmatch(r"\d{1,2}", c)]
    if nums:
        cur_n = int(nums[0])
    txt = [c for c in cells if c and not re.fullmatch(r"\d{1,2}", c) and not re.fullmatch(r"\d+ ?(er|e|re)", c)]
    if len(txt) >= 2:
        # nombre officiel de la page (hors abandons/destitutions grisés) ; années listées telles quelles
        hist[txt[0]] = (cur_n, txt[1])
agg = collections.OrderedDict()
for r in rows:
    k = r["region_normalisee"]
    a = agg.setdefault(k, {"participations": 0, "victoires": 0, "top5": 0, "demi": 0, "eds": [], "wins": []})
    a["participations"] += 1; a["eds"].append(int(r["edition"]))
    if r["classement"] == "1": a["victoires"] += 1; a["wins"].append(r["edition"])
    if r["classement"] in "12345" and r["classement"]: a["top5"] += 1
    if r["classement"] != "non_classee": a["demi"] += 1
out = []
for k, a in sorted(agg.items()):
    h = hist.get(k) or hist.get({"Albigeois Midi-Pyrénées": "Albigeois-Midi-Pyrénées"}.get(k, k))
    out.append({"region": k, "participations_2010_2026": a["participations"],
                "premiere_edition_periode": min(a["eds"]), "derniere_edition_periode": max(a["eds"]),
                "victoires_2010_2026": a["victoires"], "editions_gagnees_2010_2026": " ".join(a["wins"]),
                "top5_2010_2026": a["top5"], "demi_finales_2010_2026": a["demi"],
                "taux_victoire": round(a["victoires"] / a["participations"], 3),
                "taux_top5": round(a["top5"] / a["participations"], 3),
                "taux_demi_finale": round(a["demi"] / a["participations"], 3),
                "victoires_historiques_total": h[0] if h else (0 if hist else ""),
                "annees_victoires_historiques": h[1] if h else ""})
with open(OUT + "/regions.csv", "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=list(out[0])); w.writeheader(); w.writerows(out)
print("comités historiques parsés:", len(hist), "non rattachés à 2010-2026:", sorted(set(hist) - set(agg)))

# ---------- candidates 2027
pw.HOTE[2027] = ("Chasseneuil-du-Poitou (Futuroscope)", "Nouvelle-Aquitaine (Poitou-Charentes)", ["poitou-charentes"])
t27, _, _ = pw.parse_year(2027)
c27 = ["edition", "region", "nom", "age", "taille_cm", "couleur_cheveux", "region_hote"]
with open(OUT + "/candidates_2027.csv", "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=c27, extrasaction="ignore"); w.writeheader(); w.writerows(t27)
print("2027:", len(t27))
