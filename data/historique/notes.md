# Notes, incertitudes et limites du jeu de données

Collecte du 17 novembre 2026.

## Sources et accès

- **Source unique des CSV** : wikitexte des pages Wikipédia FR `Miss_France_2010` à `Miss_France_2027` et de la page `Miss_France` (palmarès par comité), téléchargé le 17/11/2026. Les scripts sont dans `scripts/` (`parse_wiki.py`, puis `build_tables.py`) et rejouables.
- **Accès réseau** : la session n'autorisait au départ aucun site utile. L'hôte `fr.wikipedia.org` a été ajouté, après approbation, à la liste des hôtes autorisés de l'environnement cloud « Trajets » (modification durable de cet environnement ; à retirer dans ses réglages si elle n'est plus souhaitée).
- **missfrance.fr, sites de presse, Instagram, forums : non accessibles.** Les éléments de presse de `signaux_predictifs.md` et `favoris_2027.md` proviennent des extraits du moteur de recherche, pas d'une lecture des articles. Les URL sont celles renvoyées par la recherche ; les chiffres cités sont à relire dans les articles.
- Un extrait de recherche affirmait à tort que Miss Martinique avait gagné l'édition 2026 (confusion avec 2025). Il a été écarté ; cela illustre la prudence nécessaire sur ces extraits.
- Wikipédia n'est pas une source primaire. Les pages 2016 et 2018 portent des marques « référence souhaitée » sur certains âges et tailles (6 âges en 2016, 2 tailles en 2018) : valeurs conservées mais non sourcées.

## Complétude

| Fichier | Lignes (hors en-tête) | État |
|---|---|---|
| `editions.csv` | 531 | 17 éditions sur 17 ; effectif de chaque édition égal à celui de l'infobox Wikipédia |
| `contexte_editions.csv` | 17 | Complet |
| `regions.csv` | 46 | Complet (un comité par ligne) |
| `candidates_2027.csv` | 31 | Fichier supplémentaire, non demandé : promotion 2027 avec région, nom, âge, taille |

Remplissage par colonne dans `editions.csv` :

- `region`, `nom`, `age`, `taille_cm`, `classement`, `region_hote` : 531/531.
- `couleur_cheveux` : **0/531, colonne laissée vide.** Wikipédia ne la donne pas et les fiches officielles n'étaient pas accessibles.
- `prix_speciaux` : renseigné quand la page liste un prix (17 candidates en 2010, 3 à 9 selon les autres éditions).
- `note_culture_generale` : 14 valeurs, uniquement la note de la lauréate du prix. Vide pour 2010 (pas de prix de culture générale listé), 2012 et 2026 (note absente de la page FR). Un miroir de Wikipédia EN indique 18/20 pour Miss Auvergne 2026 ; non vérifié, donc non saisi. Les notes des autres candidates ne sont pas publiées de façon systématique.
- Points de demi-finale public et jury : 222/222 demi-finalistes. Finale : 85/85 finalistes (pourcentage du vote public pour 2010-2020, points public et jury pour 2021-2026).

## Colonnes ajoutées par rapport à la demande

- `region_normalisee` : harmonise trois variantes d'écriture (Centre-Val-de-Loire, Pays de Loire, Guadeloupe et Îles du Nord). Aucune fusion de comités distincts.
- `rang_precis` : rang exact quand la page le donne (1 à 5 pour le Top 5, 6 et 7 pour les 5e et 6e dauphines, 6 à 12 ou 15 pour les éditions où le rang de chaque demi-finaliste est indiqué). Vide pour 5 demi-finalistes par édition en 2010, 2016, 2017 et 2018.
- `prix_culture_generale` (oui/non), `demi_pts_public`, `demi_pts_jury`, `finale_pts_public`, `finale_pts_jury`, `finale_pct_public`.

## Conventions et points d'attention

- **Année d'édition** = millésime du titre. Miss France 2010 a été élue le 5 décembre 2009.
- **`classement`** : `1` gagnante, `2` à `5` dauphines, `top12` ou `top15` demi-finalistes (y compris 5e et 6e dauphines), `non_classee` sinon.
- **Âge : définition variable selon les éditions.** Les pages 2024 à 2027 précisent « âge au moment de l'élection régionale » ; la page 2023 « âge au moment de l'élection » ; les pages 2010-2022 ne précisent rien. Une candidate peut donc avoir un an de plus le soir de l'élection nationale. Exemple : Diane Leyre est à 24 ans dans le tableau et Wikipédia la décrit élue à 24 ans et 5 mois.
- **Miss Nouvelle-Calédonie 2027 à 17 ans** : valeur de Wikipédia (âge à l'élection régionale de juillet 2026). Le règlement exige 18 ans au 1er novembre.
- **Finale 2016** : les pourcentages du vote public sont signalés comme approximatifs par Wikipédia (chiffres officiels non communiqués).
- **`region_hote`** : « oui » pour la candidate du comité régional sur le territoire duquel se tient la cérémonie. Choix discutables :
  - 2015 (Orléans) : Miss Orléanais retenue comme hôte, pas Miss Centre, qui coexistait.
  - 2010 (Nice) : Miss Côte d'Azur, pas Miss Provence.
  - 2020 (Marseille) : Miss Provence, pas Miss Côte d'Azur.
  - 2026 (Amiens) : Miss Picardie, pas Miss Nord-Pas-de-Calais, pourtant dans la même région administrative.
  - 2025 et 2027 (Futuroscope) : Miss Poitou-Charentes, pas Miss Aquitaine ni Miss Limousin.
  Une définition élargie à la région administrative donnerait d'autres résultats.
- **Découpage des comités** : il change au fil du temps, ce qui fragilise les séries par région.
  - 2010 : 37 comités, dont plusieurs disparus ensuite (Artois-Hainaut, Flandre, Paris, Albigeois Midi-Pyrénées, Quercy-Rouergue, Béarn-Gascogne, Berry-Val de Loire, Loire-Forez). Nord-Pas-de-Calais n'existe qu'à partir de 2011.
  - Centre et Orléanais (jusqu'en 2015) deviennent Centre-Val de Loire (2016).
  - Languedoc et Roussillon sont distincts sauf de 2017 à 2022 (Languedoc-Roussillon).
  - Saint-Martin (2013, 2015) devient Saint-Martin et Saint-Barthélemy.
  - Tahiti absente en 2021, Mayotte en 2023.
  Dans `regions.csv`, chaque intitulé d'écharpe est une ligne distincte ; à regrouper selon le besoin du modèle.
- **`victoires_historiques_total`** : nombre officiel du tableau « Palmarès par comité » de Wikipédia. Pour Paris, le total (11) exclut les titres abandonnés ou retirés alors que la colonne des années en liste 13. Un 0 signifie « comité absent du palmarès ».
- **Présidence du jury 2018** : Jean-Paul Gaultier et Iris Mittenaere sont tous deux notés présidents sur la page.
- **Règle d'égalité en demi-finale** : « le jury prévaut » est écrit explicitement jusqu'à l'édition 2021 ; les pages 2022-2026 ne la répètent pas. Pour la finale depuis 2021, c'est le public qui prévaut (appliqué en 2021 et 2026).
- **Orthographe des noms** : celle du tableau des candidates. Incohérence relevée sur la page 2027 : « Julia Grid-Costantino » (tableau) contre « Grid-Constantino » (notes).

## Limites pour la modélisation

- 17 gagnantes et 85 finalistes : tout effet estimé sur la victoire est fragile.
- Trois changements de régime : passage de 12 à 15 demi-finalistes (2020) puis retour à 12 (2026) ; vote final 100 % public jusqu'en 2020 puis 50/50 ; suppression de la limite d'âge (2023).
- Aucune variable de popularité (abonnés Instagram, sondages) n'est disponible de façon systématique : seulement des tops 5 pour 2025 et 2026 et des mentions éparses, consignés dans `signaux_predictifs.md`.
- Aucune cote de bookmaker trouvée, pour aucune édition.
- Variables absentes : couleur de cheveux, niveau d'études, profession, expérience antérieure en concours, ordre de passage.
- Pour 2027 : nombre de demi-finalistes et présidence du jury non connus ; aucun signal de popularité publié à la date de collecte.
