#!/usr/bin/env python3
"""Parse le wikitexte des pages fr.wikipedia « Miss France 20XX » (2010-2026)
et produit editions.csv. Usage : parse_wiki.py <dossier_wikitexte> <dossier_sortie>
"""
import csv, re, sys, unicodedata, json
import mwparserfromhell as mw

SRC, OUT = sys.argv[1], sys.argv[2]

# Région (échelle des comités Miss) accueillant la cérémonie -> motifs de nom de candidate-région
HOTE = {
    2010: ("Nice", "Provence-Alpes-Côte d'Azur", ["cote d'azur"]),
    2011: ("Caen", "Normandie (Basse-Normandie)", ["normandie", "basse-normandie"]),
    2012: ("Brest", "Bretagne", ["bretagne"]),
    2013: ("Limoges", "Limousin", ["limousin"]),
    2014: ("Dijon", "Bourgogne", ["bourgogne"]),
    2015: ("Orléans", "Centre (Orléanais)", ["orleanais"]),
    2016: ("Lille", "Nord-Pas-de-Calais", ["nord-pas-de-calais"]),
    2017: ("Montpellier", "Languedoc-Roussillon", ["languedoc-roussillon", "languedoc"]),
    2018: ("Châteauroux (Déols)", "Centre-Val de Loire", ["centre-val de loire", "centre-val-de-loire", "centre"]),
    2019: ("Lille", "Hauts-de-France (Nord-Pas-de-Calais)", ["nord-pas-de-calais"]),
    2020: ("Marseille", "Provence-Alpes-Côte d'Azur (Provence)", ["provence"]),
    2021: ("Les Epesses (Puy du Fou)", "Pays de la Loire", ["pays de la loire", "pays de loire"]),
    2022: ("Caen", "Normandie", ["normandie"]),
    2023: ("Châteauroux (Déols)", "Centre-Val de Loire", ["centre-val de loire", "centre-val-de-loire"]),
    2024: ("Dijon", "Bourgogne-Franche-Comté (Bourgogne)", ["bourgogne"]),
    2025: ("Chasseneuil-du-Poitou (Futuroscope)", "Nouvelle-Aquitaine (Poitou-Charentes)", ["poitou-charentes"]),
    2026: ("Amiens", "Hauts-de-France (Picardie)", ["picardie"]),
}


def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[^a-z0-9' -]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def strip_refs(t):
    t = re.sub(r"<ref[^>/]*/>", "", t)
    t = re.sub(r"<ref[^>]*>.*?</ref>", "", t, flags=re.S)
    return t


ORD = {"1re": "1re", "1ère": "1re", "1ere": "1re"}


def clean(t):
    t = strip_refs(t)
    t = re.sub(r"\[\[(?:Fichier|File|Image):[^\]]*\]\]", "", t)
    t = re.sub(r"\{\{(1re|1ère|1ere|\d+e)\|([^}]*)\}\}", r"\1 \2", t)
    t = re.sub(r"\{\{(1re|1ère|1ere|\d+e)\}\}", r"\1", t)
    t = re.sub(r"\{\{\s*tri\s*\|[^|}]*\|((?:[^{}]|\[\[[^\]]*\]\])*)\}\}", r"\1", t, flags=re.I)
    for _ in range(2):
        t = re.sub(r"\{\{\s*référence souhaitée\s*\|((?:[^{}|]|\{\{[^{}]*\}\}|\[\[[^\]]*\]\])*)(?:\|[^{}]*)?\}\}", r"\1", t, flags=re.I)
    t = re.sub(r"\{\{TriNom\|([^|}]*)\|([^|}]*)[^}]*\}\}", r"\1 \2", t, flags=re.I)
    t = re.sub(r"\{\{\s*(?:unité|nombre|nb|nobr)\s*\|([^|}]*)\|?([^|}]*)[^}]*\}\}", r"\1 \2", t, flags=re.I)
    t = re.sub(r"\{\{drapeau\|[^}]*\}\}", "", t, flags=re.I)
    t = re.sub(r"\{\{(Normandie|Bretagne)\}\}", r"\1", t)
    t = re.sub(r"<br\s*/?>", " ; ", t)
    t = re.sub(r"<[^>]+>", "", t)
    try:
        t = mw.parse(t).strip_code()
    except Exception:
        pass
    t = t.replace("'''", "").replace("''", "")
    return re.sub(r"\s+", " ", t).strip(" ;")


def section(text, pattern, level_stop=True):
    m = re.search(r"^(=+) *(?:%s)[^=\n]*=+ *$" % pattern, text, flags=re.M | re.I)
    if not m:
        return ""
    lvl = len(m.group(1))
    rest = text[m.end():]
    m2 = re.search(r"^={1,%d}[^=]" % lvl, rest, flags=re.M)
    return rest[: m2.start()] if m2 else rest


def tables(text):
    return re.findall(r"\{\|.*?\n\|\}", text, flags=re.S)


def rows(table):
    body = table[2:-2]
    parts = re.split(r"^\|-.*$", body, flags=re.M)
    out = []
    for p in parts:
        cells, cur = [], None
        for line in p.split("\n"):
            if line.startswith("|+"):
                continue
            if line.startswith("!") or line.startswith("|"):
                hdr = line.startswith("!")
                segs = re.split(r"\|\||!!", line[1:])
                for s in segs:
                    # retirer les attributs de cellule (avant un | isolé, hors liens/modèles)
                    s2 = re.sub(r"\[\[.*?\]\]|\{\{.*?\}\}|<ref.*?(?:/>|</ref>)", lambda m: "\0" * len(m.group(0)), s, flags=re.S)
                    i = s2.find("|")
                    if i >= 0 and re.match(r'^[\w\s="\':;#%.{}\-]*$', s2[:i]) and ("=" in s2[:i] or s2[:i].strip() == ""):
                        s = s[i + 1:]
                    cells.append([hdr, s])
                cur = cells[-1]
            elif cur is not None:
                cur[1] += "\n" + line
        if cells:
            out.append(cells)
    return out


def rank_label(lbl):
    l = norm(lbl)
    if l.startswith("miss france"):
        return "1"
    m = re.match(r"(\d)(?:re|ere|e) dauphine", l)
    if m:
        return str(int(m.group(1)) + 1)
    if "top 15" in l:
        return "top15"
    if "top 12" in l or "demi-finaliste" in l or "demi finaliste" in l:
        return "top12"
    return None


def region_key(r):
    r = norm(r.replace("’", "'"))
    r = re.sub(r"^miss ", "", r).replace("cote-d'azur", "cote d'azur").replace("cote-dazur", "cote d'azur")
    r = r.replace("ile-de-france", "ile-de-france").replace("centre-val-de-loire", "centre-val de loire")
    r = r.replace("la reunion", "reunion").replace("pays de loire", "pays de la loire")
    return r


def parse_year(y):
    text = open(f"{SRC}/mf{y}.wiki", encoding="utf-8").read()
    # --- classement final
    cf = section(text, "Classement final")
    final = {}  # region_key -> (classement, rang_precis, nom)
    semis = "top12"
    for t in tables(cf)[:1]:
        for r in rows(t):
            if len(r) < 2:
                continue
            rk = rank_label(clean(r[0][1]))
            if not rk:
                continue
            if rk.startswith("top"):
                semis = rk
            for item in re.findall(r"^\*+(.*)$", r[1][1], flags=re.M):
                c = clean(item)
                m = re.split(r"\s+[—–-]\s+", c, maxsplit=1)
                if len(m) < 2:
                    continue
                reg, rest = m[0], m[1]
                rp = ""
                md = re.search(r"\(?\s*(\d)e dauphine\s*\)?", rest)
                if md:
                    rp = str(int(md.group(1)) + 1)
                    rest = rest[: md.start()].strip(" (")
                final[region_key(reg)] = (rk, rp if rk.startswith("top") else rk, rest.strip())
    # --- points demi-finale / finale
    cl = text
    pts = {}
    for t in tables(text):
        rs = rows(t)
        if not rs:
            continue
        hdr = [norm(clean(c[1])) for c in rs[0]]
        if "public" in hdr and "jury" in hdr:
            ip, ij = hdr.index("public"), hdr.index("jury")
            ic = 1 if hdr[0] in ("n", "no", "n deg", "rang", "") or hdr[0].startswith("n") and len(hdr[0]) < 4 else 0
            is_final = len(rs) <= 7
            for r in rs[1:]:
                if len(r) <= max(ip, ij):
                    continue
                k = region_key(clean(r[ic][1]))
                d = pts.setdefault(k, {})
                pre = "finale" if is_final else "demi"
                d[pre + "_public"] = clean(r[ip][1])
                d[pre + "_jury"] = clean(r[ij][1])
        elif len(hdr) == 2 and "resultat" in hdr[1] and len(rs) <= 7:
            for r in rs[1:]:
                if len(r) >= 2:
                    pts.setdefault(region_key(clean(r[0][1])), {})["finale_pct_public"] = clean(r[1][1])
    # --- prix
    prix = {}
    notes_cg = {}
    pa = section(text, "Prix attribués")
    for t in tables(pa):
        for r in rows(t)[1:]:
            if len(r) < 2:
                continue
            p = clean(r[0][1])
            for cand in re.split(r"\n\*|<br\s*/?>", strip_refs(r[1][1])):
                c = clean(cand)
                if not c:
                    continue
                m = re.split(r"\s+[—–-]\s+", c, maxsplit=1)
                k = region_key(m[0])
                prix.setdefault(k, []).append(p)
                mn = re.search(r"\((\d+(?:[.,]\d+)?)\s*/\s*(\d+)\)", c)
                if mn and "culture" in norm(p):
                    notes_cg[k] = f"{mn.group(1).replace(',', '.')}/{mn.group(2)}"
    # --- candidates
    cs = section(text, r"Candidates\s*(?==)")
    out = []
    tb = tables(cs)
    if not tb:
        return out, semis, final
    rs = rows(tb[0])
    hdr = [norm(clean(c[1])) for c in rs[0]]
    def col(name):
        for i, h in enumerate(hdr):
            if h.startswith(name):
                return i
        return None
    ireg, inom, iage, itai = col("region"), col("nom"), col("age"), col("taille")
    icl = col("classement") if col("classement") is not None else col("resultat")
    used = set()
    for r in rs[1:]:
        if len(r) < 4:
            continue
        reg = clean(r[ireg][1])
        reg = re.sub(r"^Miss\s+", "", reg)
        nom = clean(r[inom][1])
        age = re.search(r"\d+", clean(r[iage][1]) or "")
        tm = re.search(r"(\d)[.,](\d{2})", clean(r[itai][1]) or "")
        taille = int(tm.group(1)) * 100 + int(tm.group(2)) if tm else ""
        k = region_key(reg)
        f = final.get(k)
        if not f:  # appariement par nom
            for kk, v in final.items():
                if norm(v[2]) and norm(v[2]) == norm(nom):
                    f, k2 = v, kk
                    break
        cl_col = clean(r[icl][1]) if icl is not None and icl < len(r) else ""
        mrp = re.search(r"\((\d+)e(?: place)?\)", cl_col)
        if f and f[0].startswith("top") and not f[1] and mrp:
            f = (f[0], mrp.group(1), f[2])
        if f:
            used.add(k if k in final else k2)
        p = list(prix.get(k, []))
        # prix mentionnés dans la colonne « classement final » de la table
        for seg in re.split(r";|\*", cl_col):
            seg = seg.strip()
            if seg.lower().startswith("prix") and not any(norm(seg) == norm(x) for x in p):
                p.append(seg)
        note = notes_cg.get(k, "")
        pt = pts.get(k, {})
        out.append({
            "edition": y, "region": reg, "nom": nom, "age": age.group(0) if age else "",
            "taille_cm": taille, "couleur_cheveux": "",
            "classement": f[0] if f else "non_classee",
            "rang_precis": f[1] if f else "",
            "prix_speciaux": " | ".join(p), "note_culture_generale": note,
            "region_hote": "oui" if k in HOTE[y][2] else "non",
            "demi_pts_public": pt.get("demi_public", ""), "demi_pts_jury": pt.get("demi_jury", ""),
            "finale_pts_public": pt.get("finale_public", ""), "finale_pts_jury": pt.get("finale_jury", ""),
            "finale_pct_public": pt.get("finale_pct_public", ""),
            "_cl_col": cl_col,
        })
    missing = set(final) - used
    unp = set(pts) - {region_key(o["region"]) for o in out}
    unprix = set(prix) - {region_key(o["region"]) for o in out}
    print(y, "candidates", len(out), "classées", len(final), "non appariées:", missing, "| pts orphelins:", unp, "| prix orphelins:", unprix, file=sys.stderr)
    return out, semis, final


allrows = []
meta = {}
for y in range(2010, 2027):
    o, semis, final = parse_year(y)
    meta[y] = {"n": len(o), "semis": semis, "n_classees": len(final)}
    allrows += o

cols = ["edition", "region", "nom", "age", "taille_cm", "couleur_cheveux", "classement", "rang_precis", "prix_speciaux",
        "note_culture_generale", "region_hote", "demi_pts_public", "demi_pts_jury", "finale_pts_public",
        "finale_pts_jury", "finale_pct_public"]
with open(f"{OUT}/editions.csv", "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
    w.writeheader()
    w.writerows(allrows)
json.dump({"meta": meta, "rows": allrows}, open(f"{OUT}/scripts/_parsed.json", "w"), ensure_ascii=False)
