"""Modèle de pronostic Miss France 2027.

Logit ordonné "éclaté" (Plackett-Luce) ajusté sur les Top 5 de Miss France 2010-2026,
validé en laissant une édition de côté, puis simulation Monte-Carlo pour 2027.

Usage : python3 model/model.py   (depuis la racine du dépôt)
Sorties : data/model/predictions.json, data/model/validation.json
"""
import json
import os
from datetime import date

import numpy as np
import pandas as pd
from scipy.optimize import minimize

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HIST = os.path.join(ROOT, "data", "historique")
OUT = os.path.join(ROOT, "data", "model")
SIGNALS = os.path.join(ROOT, "data", "signaux_2027.json")

# L'âge (linéaire : effet nul ; quadratique : porté par la seule gagnante de 34 ans en 2025)
# et la taille continue ont été testés puis écartés : ils n'améliorent pas la validation de façon robuste.
FEATURES = ["taille_175", "reg_top5", "reg_demi", "hote"]
LABELS = {
    "taille_z": "Taille (écart à la moyenne de la promotion)",
    "taille_175": "Taille ≥ 175 cm",
    "age_c": "Âge (plafonné à 27 ans)",
    "age_c2": "Âge, effet quadratique",
    "reg_top5": "Historique régional : taux de Top 5",
    "reg_demi": "Historique régional : taux de demi-finale",
    "hote": "Région hôte",
}
L2 = 1.0  # régularisation ridge
SHRINK = 8  # éditions fictives ajoutées pour lisser l'historique régional
N_SIM = 200_000
RNG = np.random.default_rng(2027)

# Rattachement des comités 2027 à leur série historique
ALIAS = {}


def load():
    d = pd.read_csv(os.path.join(HIST, "editions.csv"))
    d["region_key"] = d["region_normalisee"].fillna(d["region"])
    d["top5"] = d["classement"].isin(["1", "2", "3", "4", "5"]).astype(int)
    d["demi"] = (d["classement"] != "non_classee").astype(int)
    d["rang"] = pd.to_numeric(d["classement"], errors="coerce")
    d["hote"] = (d["region_hote"] == "oui").astype(int)
    c = pd.read_csv(os.path.join(HIST, "candidates_2027.csv"))
    c["region_key"] = c["region"].replace(ALIAS)
    c["hote"] = (c["region_hote"] == "oui").astype(int)
    return d, c


def region_priors(train):
    """Taux de Top 5 / demi-finale par région, lissés vers la moyenne générale."""
    p5, pd_ = train["top5"].mean(), train["demi"].mean()
    g = train.groupby("region_key").agg(n=("top5", "size"), k5=("top5", "sum"), kd=("demi", "sum"))
    g["reg_top5"] = (g.k5 + SHRINK * p5) / (g.n + SHRINK)
    g["reg_demi"] = (g.kd + SHRINK * pd_) / (g.n + SHRINK)
    return g[["reg_top5", "reg_demi"]], p5, pd_


def featurize(df, priors, p5, pd_):
    x = pd.DataFrame(index=df.index)
    grp = df["edition"]
    mu = df.groupby(grp)["taille_cm"].transform("mean")
    sd = df.groupby(grp)["taille_cm"].transform("std")
    x["taille_z"] = (df["taille_cm"] - mu) / sd
    x["taille_175"] = (df["taille_cm"] >= 175).astype(float)
    a = df["age"].clip(upper=27) - 21
    x["age_c"] = a / 3
    x["age_c2"] = (a / 3) ** 2
    m = df[["region_key"]].join(priors, on="region_key")
    x["reg_top5"] = (m["reg_top5"].fillna(p5) - p5) / 0.08
    x["reg_demi"] = (m["reg_demi"].fillna(pd_) - pd_) / 0.12
    x["hote"] = df["hote"].astype(float)
    return x[FEATURES].to_numpy()


def nll(beta, groups):
    """Log-vraisemblance négative du logit éclaté sur les rangs 1..5."""
    total = 0.0
    for X, order in groups:
        s = X @ beta
        alive = np.ones(len(s), bool)
        for i in order:
            sa = s[alive]
            mx = sa.max()
            total -= s[i] - (mx + np.log(np.exp(sa - mx).sum()))
            alive[i] = False
    return total + L2 * beta @ beta


def build_groups(df, X):
    groups = []
    for _, idx in df.groupby("edition").indices.items():
        sub = df.iloc[idx]
        order = [int(np.where(sub["rang"].to_numpy() == r)[0][0]) for r in range(1, 6)]
        groups.append((X[idx], order))
    return groups


def fit(train):
    priors_all, p5, pd_ = region_priors(train)
    # Pour l'apprentissage, l'historique régional de chaque édition exclut cette édition
    parts = []
    for ed in sorted(train["edition"].unique()):
        pr, a, b = region_priors(train[train.edition != ed])
        sub = train[train.edition == ed]
        parts.append(pd.DataFrame(featurize(sub, pr, a, b), index=sub.index))
    X = pd.concat(parts).loc[train.index].to_numpy()
    groups = build_groups(train.reset_index(drop=True), X)
    res = minimize(nll, np.zeros(len(FEATURES)), args=(groups,), method="BFGS")
    return res.x, (priors_all, p5, pd_)


def simulate(scores, n=N_SIM):
    """Tirages Plackett-Luce (astuce de Gumbel) -> matrice P[candidate, rang 1..5]."""
    g = RNG.gumbel(size=(n, len(scores)))
    top = np.argsort(-(scores + g), axis=1)[:, :5]
    P = np.zeros((len(scores), 5))
    for r in range(5):
        P[:, r] = np.bincount(top[:, r], minlength=len(scores)) / n
    return P


def validate(d):
    rows = []
    for ed in sorted(d["edition"].unique()):
        train, test = d[d.edition != ed], d[d.edition == ed].reset_index(drop=True)
        beta, (pr, p5, pd_) = fit(train)
        s = featurize(test, pr, p5, pd_) @ beta
        P = simulate(s, 40_000)
        ptop5 = P.sum(1)
        n = len(test)
        pred5 = set(np.argsort(-ptop5)[:5])
        real5 = set(test.index[test.top5 == 1])
        w = int(test.index[test.rang == 1][0])
        rows.append({
            "edition": int(ed),
            "n": n,
            "top5_trouvees": len(pred5 & real5),
            "attendu_hasard": round(25 / n, 2),
            "rang_modele_gagnante": int((np.argsort(-P[:, 0]) == w).nonzero()[0][0]) + 1,
            "p_gagnante": round(float(P[w, 0]), 4),
            "p_hasard": round(1 / n, 4),
            "logloss_top5": round(float(-np.mean(np.where(test.top5 == 1, np.log(ptop5), np.log(1 - ptop5)))), 4),
            "logloss_top5_hasard": round(float(-(5 / n * np.log(5 / n) + (1 - 5 / n) * np.log(1 - 5 / n))), 4),
        })
    v = pd.DataFrame(rows)
    summary = {
        "editions": len(v),
        "top5_trouvees_moyenne": round(float(v.top5_trouvees.mean()), 2),
        "top5_hasard_moyenne": round(float(v.attendu_hasard.mean()), 2),
        "rang_median_gagnante": float(v.rang_modele_gagnante.median()),
        "gagnante_dans_top5_modele": int((v.rang_modele_gagnante <= 5).sum()),
        "gagnante_dans_top10_modele": int((v.rang_modele_gagnante <= 10).sum()),
        "logloss_top5": round(float(v.logloss_top5.mean()), 4),
        "logloss_top5_hasard": round(float(v.logloss_top5_hasard.mean()), 4),
    }
    return summary, rows


def load_signals():
    """Signaux propres à 2027 (Instagram, favoris presse, culture générale...).

    Format : {"maj": "AAAA-MM-JJ", "candidates": {"<region>": {"bonus": 0.4, "motifs": ["..."]}}}
    Le bonus s'ajoute au score (échelle log) : +0,69 double la force relative.
    """
    if not os.path.exists(SIGNALS):
        return {"maj": None, "candidates": {}}
    with open(SIGNALS, encoding="utf-8") as f:
        return json.load(f)


def main():
    os.makedirs(OUT, exist_ok=True)
    d, c = load()
    summary, rows = validate(d)
    beta, (pr, p5, pd_) = fit(d)
    Xc = featurize(c, pr, p5, pd_)
    base = Xc @ beta
    sig = load_signals()
    bonus = np.array([sig["candidates"].get(r, {}).get("bonus", 0.0) for r in c["region"]])
    P = simulate(base + bonus)
    ptop5 = P.sum(1)
    out = []
    for i, row in c.iterrows():
        contrib = {f: round(float(Xc[i, j] * beta[j]), 3) for j, f in enumerate(FEATURES)}
        out.append({
            "region": row["region"],
            "nom": row["nom"],
            "age": int(row["age"]),
            "taille_cm": int(row["taille_cm"]),
            "score_base": round(float(base[i]), 3),
            "bonus_signaux": round(float(bonus[i]), 3),
            "motifs_signaux": sig["candidates"].get(row["region"], {}).get("motifs", []),
            "contributions": contrib,
            "p_rang": [round(float(p), 4) for p in P[i]],
            "p_victoire": round(float(P[i, 0]), 4),
            "p_top5": round(float(ptop5[i]), 4),
            # Cote = gain pour 1 point misé sur "dans le Top 5", bornée pour rester jouable
            "cote": round(float(np.clip(1 / ptop5[i], 1.5, 15)), 1),
        })
    out.sort(key=lambda r: -r["p_top5"])
    # Top 5 ordonné le plus probable : affectation gloutonne rang par rang
    taken, top5 = set(), []
    for r in range(5):
        best = max((o for o in out if o["region"] not in taken), key=lambda o: sum(o["p_rang"][: r + 1]))
        taken.add(best["region"])
        top5.append({"rang": r + 1, "region": best["region"], "nom": best["nom"],
                     "p_victoire": best["p_victoire"], "p_top5": best["p_top5"]})
    result = {
        "genere_le": date.today().isoformat(),
        "signaux_maj": sig.get("maj"),
        "coefficients": {f: {"libelle": LABELS[f], "beta": round(float(b), 3)} for f, b in zip(FEATURES, beta)},
        "top5_pronostic": top5,
        "candidates": out,
    }
    with open(os.path.join(OUT, "predictions.json"), "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)
    win, t5 = d[d.rang == 1], d[d.top5 == 1]
    reg = d.groupby("region_key").agg(n=("top5", "size"), victoires=("rang", lambda r: int((r == 1).sum())),
                                      top5=("top5", "sum"), demi=("demi", "sum")).reset_index()
    reg = reg[reg.region_key.isin(c.region_key)].sort_values(["top5", "demi"], ascending=False)
    stats = {
        "n_candidates": len(d), "n_editions": int(d.edition.nunique()),
        "taille": {"toutes": round(d.taille_cm.mean(), 1), "top5": round(t5.taille_cm.mean(), 1), "gagnantes": round(win.taille_cm.mean(), 1),
                   "gagnantes_175_plus": int((win.taille_cm >= 175).sum()), "part_candidates_175_plus": round(float((d.taille_cm >= 175).mean()), 3),
                   "top5_si_175_plus": round(float(d[d.taille_cm >= 175].top5.mean()), 3), "top5_si_moins_175": round(float(d[d.taille_cm < 175].top5.mean()), 3)},
        "age": {"toutes": round(d.age.mean(), 1), "top5": round(t5.age.mean(), 1), "gagnantes": round(win.age.mean(), 1)},
        "hote": {"n": int(d.hote.sum()), "victoires": int(d[d.hote == 1].rang.eq(1).sum()), "top5": int(d[d.hote == 1].top5.sum()), "demi": int(d[d.hote == 1].demi.sum())},
        "regions": [{"region": r.region_key, "participations": int(r.n), "victoires": int(r.victoires), "top5": int(r.top5), "demi": int(r.demi)} for r in reg.itertuples()],
    }
    with open(os.path.join(OUT, "stats.json"), "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, "validation.json"), "w", encoding="utf-8") as f:
        json.dump({"resume": summary, "par_edition": rows}, f, ensure_ascii=False, indent=1)
    print(json.dumps(summary, ensure_ascii=False, indent=1))
    print(json.dumps(result["coefficients"], ensure_ascii=False, indent=1))
    for o in out:
        print(f'{o["region"]:35s} {o["nom"]:30s} win {o["p_victoire"]:.3f} top5 {o["p_top5"]:.3f} cote {o["cote"]}')
    print(top5)


if __name__ == "__main__":
    main()
