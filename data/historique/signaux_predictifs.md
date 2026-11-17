# Signaux prédictifs — Miss France 2010-2026

Document de synthèse établi le 17 novembre 2026.

**Deux niveaux de preuve, à ne pas confondre :**

- **[DONNÉES]** : chiffres calculés sur `editions.csv` (531 candidates, 17 éditions), lui-même extrait des pages Wikipédia FR « Miss France 20XX » (lues intégralement en wikitexte).
- **[PRESSE]** : ce que disent des articles de presse ou de sites de fans. **Attention : ces articles n'ont pas pu être ouverts** (le réseau de la session n'autorise que fr.wikipedia.org) ; les éléments rapportés viennent des extraits renvoyés par le moteur de recherche. Les URL sont exactes, mais les chiffres cités n'ont pas été relus dans le texte intégral. À revérifier avant usage dans le modèle.

Taux de base sur 2010-2026 : victoire 3,2 % (17/531), Top 5 16,0 % (85/531), demi-finale 41,8 % (222/531).

---

## 1. Mécanique du vote (le signal structurel le plus important)

[DONNÉES] Source : sections « Classement » des pages Wikipédia de chaque édition, et [Miss France — Processus d'élection](https://fr.wikipedia.org/wiki/Miss_France).

| Étape | 2010-2020 | 2021-2026 |
|---|---|---|
| Présélection des 12 ou 15 demi-finalistes | Jury interne (société Miss France, partenaires), entretien quelques jours avant ; critères : éloquence, physique, test de culture générale. **0 % public.** | Idem |
| Demi-finale → Top 5 | 50 % public / 50 % jury (rangs convertis en points, égalité : jury) | Idem |
| Finale → gagnante | **100 % public** | **50 % public / 50 % jury**, égalité : public |

Nombre de demi-finalistes : 12 (2010-2019), 15 (2020-2025), de nouveau 12 en 2026.

Conséquences mesurées :

- **La gagnante est presque toujours une favorite du public.** Au vote public de la demi-finale, la future gagnante était 1re dans 11 éditions sur 17, 1re ou 2e dans 16 sur 17, et au pire 3e (Ève Gilles, 2024).
- **Le jury seul ne suffit pas, le public seul non plus depuis 2021.** Sur les 6 finales à vote mixte : la 1re du public a gagné 3 fois (2021, 2023, 2026), la 1re du jury 4 fois (2022, 2023, 2024, 2025). En 2021 et 2026, l'égalité de points a été tranchée en faveur du public.
- **La présélection est un filtre à part.** Une candidate très populaire peut ne pas entrer en demi-finale : c'est le cas de Lola Lacheré (Nord-Pas-de-Calais, 2026), donnée favorite par un modèle fondé sur les réseaux sociaux et non retenue dans le Top 12 (voir §7).

Un modèle devrait donc traiter séparément (a) la probabilité d'être présélectionnée, (b) le score public, (c) le score jury.

## 2. Âge

[DONNÉES]

| Groupe | n | Âge moyen | Âge médian |
|---|---|---|---|
| Toutes les candidates | 531 | 20,9 | 20 |
| Demi-finalistes (dont Top 5) | 222 | 21,1 | 21 |
| Top 5 | 85 | 21,0 | 21 |
| Gagnantes | 17 | 21,6 | 22 |
| Gagnantes hors 2025 (34 ans) | 16 | 20,9 | 21 |

Âges des gagnantes : 18, 18, 19, 19, 19, 19, 19, 20, 22, 22, 22, 23, 23, 23, 24, 24, 34.

Taux par tranche d'âge :

| Âge | n | Demi-finale | Top 5 | Victoire |
|---|---|---|---|---|
| 17-18 | 67 | 40 % | 22 % | 3,0 % |
| 19 | 111 | 43 % | 18 % | 4,5 % |
| 20-21 | 161 | 35 % | 11 % | 0,6 % |
| 22-23 | 123 | 43 % | 15 % | 4,9 % |
| 24 | 45 | 51 % | 22 % | 4,4 % |
| 25 et plus | 24 | 58 % | 21 % | 4,2 % |

Lecture : l'effet de l'âge est faible et non monotone. Le creux à 20-21 ans (1 gagnante sur 161) est curieux mais repose sur de petits effectifs ; il ne faut pas le sur-interpréter.

**Rupture de régime en 2022-2023** : la limite de 24 ans a été supprimée (règlement modifié à partir de Miss France 2023). Âge maximal parmi les candidates : 24 jusqu'en 2022, puis 26, 28, 34, 30. L'âge moyen des candidates passe à 22,0 sur 2023-2026. Les données d'avant 2023 informent donc mal sur les candidates de 25 ans et plus.

Réserve : l'âge publié par Wikipédia est, selon les éditions, l'âge à l'élection régionale ou à l'élection nationale (voir `notes.md`).

[PRESSE] Une étude attribuée à Télé-Loisirs, reprise par LyonMag en 2018, décrivait une Miss « idéale » de 19 ans en moyenne ([lyonmag.com](https://www.lyonmag.com/article/98417/miss-france-2019-les-statistiques-donnent-miss-rhone-alpes-gagnante)). Méthode non détaillée dans l'extrait. Ce « modèle statistique » donnait Miss Rhône-Alpes gagnante pour 2019 ; dans nos données elle n'a pas été présélectionnée (non classée) cette année-là, et c'est Tahiti qui a gagné.

## 3. Taille

[DONNÉES]

| Groupe | n | Taille moyenne | Médiane |
|---|---|---|---|
| Toutes les candidates | 531 | 174,6 cm | 174 |
| Demi-finalistes | 222 | 174,8 cm | 174 |
| Top 5 | 85 | 175,1 cm | 175 |
| Gagnantes | 17 | **177,1 cm** | 177 |

| Taille | n | Demi-finale | Top 5 | Victoire |
|---|---|---|---|---|
| ≤ 171 cm | 112 | 34 % | 13 % | 0,9 % |
| 172-174 | 170 | 45 % | 12 % | 0,6 % |
| 175-177 | 145 | 48 % | 21 % | 6,2 % |
| 178-180 | 68 | 31 % | 18 % | 4,4 % |
| ≥ 181 | 36 | 47 % | 17 % | 8,3 % |

Lecture : 15 gagnantes sur 17 mesurent 175 cm ou plus, alors que 53 % des candidates sont sous 175 cm. C'est le signal individuel le plus net des données, mais il porte sur 17 gagnantes seulement. Exceptions : Iris Mittenaere (172 cm, 2016) et Ève Gilles (170 cm, 2024). L'écart est bien plus faible pour l'accès au Top 5 (+0,5 cm en moyenne).

## 4. Région

[DONNÉES] Détail complet dans `regions.csv`. Régions les plus performantes sur 2010-2026 :

| Région | Participations | Victoires | Top 5 | Demi-finales | Taux Top 5 | Victoires historiques |
|---|---|---|---|---|---|---|
| Tahiti | 16 | 2 | 9 | 11 | 56 % | 6 |
| Guadeloupe | 17 | 2 | 8 | 10 | 47 % | 4 |
| Nord-Pas-de-Calais | 16 | **4** | 7 | 9 | 44 % | 4 |
| Provence | 17 | 0 | 7 | 12 | 41 % | 0 |
| Côte d'Azur | 17 | 0 | 6 | **15** | 35 % | 4 |
| Martinique | 17 | 1 | 5 | 8 | 29 % | 1 |
| Normandie | 17 | 2 | 4 | 9 | 24 % | 7 |
| Alsace | 17 | 1 | 4 | 9 | 24 % | 6 |
| Réunion | 17 | 0 | 4 | 9 | 24 % | 2 |
| Île-de-France | 17 | 1 | 3 | 10 | 18 % | 3 |

Points saillants :

- **Nord-Pas-de-Calais** : 4 victoires en 16 participations (25 %), toutes depuis 2015. C'est huit fois le taux de base.
- **Tahiti** : meilleure régularité (Top 5 plus d'une fois sur deux), victoires en 2019 et 2026. Absente en 2021.
- **Guadeloupe** : Top 5 quatre années de suite (2023-2026), victoires 2020 et 2023.
- **Normandie** : 2 victoires (2010, 2021), 7 au total historique (2e comité derrière Paris).
- **Alsace** : 6 victoires historiques mais une seule sur la période (2012) ; taux Top 5 de 24 %.
- **Provence et Côte d'Azur** : très souvent placées, jamais gagnantes sur la période. Côte d'Azur est en demi-finale 15 fois sur 17 (classée 8 années consécutives à fin 2026).
- **Outre-mer dans son ensemble** : 129 candidatures, 6 victoires (4,7 %), 29 Top 5 (22 %) — au-dessus du taux de base, mais porté par Tahiti, Guadeloupe et Martinique ; Mayotte, Saint-Pierre-et-Miquelon, Saint-Martin et Wallis-et-Futuna n'ont aucun Top 5.
- Jamais dans le Top 5 sur la période malgré 16-17 participations : Poitou-Charentes, Midi-Pyrénées, Mayotte, Centre-Val de Loire.

Réserve : 17 éditions, c'est peu. Avec 30 régions et un taux de base de 3 %, une région « sans victoire » n'a rien d'anormal. Les taux de Top 5 et de demi-finale sont statistiquement plus solides que les taux de victoire.

[PRESSE] Europe 1 a publié des palmarès par région administrative (Île-de-France en tête depuis 1920 en regroupant Paris) et la liste des régions jamais titrées (Auvergne, Champagne-Ardenne, Limousin…) : [europe1.fr](https://www.europe1.fr/societe/miss-france-quelles-sont-les-regions-qui-nont-jamais-remporte-la-couronne-873961). Les décomptes diffèrent de ceux de Wikipédia selon que l'on compte par comité ou par région administrative.

## 5. Prix de culture générale

[DONNÉES] Le prix est identifié pour 16 éditions (2011-2026 ; pas de prix de culture générale dans la liste 2010).

| Devenir de la lauréate du prix | Nombre | Éditions |
|---|---|---|
| Élue Miss France | 4 | 2011, 2013, 2016, 2020 |
| Autre place du Top 5 | 4 | 2012, 2018, 2021, 2022 |
| Demi-finaliste hors Top 5 | 5 | 2014, 2015, 2017, 2025, 2026 |
| Non classée | 3 | 2019, 2023, 2024 |

- Taux de victoire : 25 % (contre 3,2 % de base). Taux de Top 5 : 50 % (contre 16 %). Taux de demi-finale : 81 % (contre 42 %).
- **Le signal s'affaiblit nettement** : sur 2011-2020, 4 gagnantes en 10 éditions ; sur 2021-2026, aucune gagnante et 2 Top 5 en 6 éditions. Les lauréates 2023 (Normandie, 17,5/20) et 2024 (Alsace) n'ont même pas été présélectionnées.
- Les notes de la première sont publiées pour 14 éditions (colonne `note_culture_generale`) ; les notes des autres candidates ne le sont pas, sauf mentions isolées dans la presse.

[PRESSE] La non-présélection de Miss Normandie (édition 2023) malgré deux prix a été relevée par TV Magazine ([tvmag.lefigaro.fr](https://tvmag.lefigaro.fr/programme-tv/miss-france/prix-de-la-culture-generale-prix-des-bonnes-manieres-l-incomprehensible-absence-de-miss-normandie-du-top-15-de-miss-france-2023-20221219), référence citée par la page Wikipédia de l'édition). Moyenne générale du test : environ 30/60 en 2023 selon Cindy Fabre ([lavenir.net](https://www.lavenir.net/actu/2023/11/28/la-moyenne-est-aux-alentours-de-30-sur-60-passerez-vous-le-test-de-culture-generale-de-miss-france-2024-7DAOUSV7F5FHDK3MSEE4CP5DYY/)).

## 6. Région hôte

[DONNÉES] Candidate représentant le comité régional où se tient la cérémonie, 17 éditions :

| Résultat | Nombre | Éditions |
|---|---|---|
| Élue | 1 | 2016 (Iris Mittenaere, Lille) |
| 1re dauphine | 2 | 2017 (Languedoc-Roussillon, Montpellier), 2020 (Provence, Marseille) |
| 4e dauphine | 1 | 2022 (Normandie, Caen) |
| Demi-finaliste hors Top 5 | 8 | 2010, 2011, 2012, 2014, 2019, 2021, 2024, 2026 |
| Non classée | 5 | 2013, 2015, 2018, 2023, 2025 |

- Demi-finale : 12/17 = 71 % (base 42 %). Top 5 : 4/17 = 24 % (base 16 %). Victoire : 1/17 = 6 % (base 3 %).
- **L'avantage existe surtout pour la présélection**, décidée par le jury interne. Il est faible pour le Top 5 et non démontrable pour la victoire.
- Il dépend de la force de la région : les hôtes « fortes » (Nord-Pas-de-Calais, Provence, Normandie, Languedoc-Roussillon) se classent ; les hôtes « faibles » (Centre-Val de Loire en 2018 et 2023, Limousin 2013, Poitou-Charentes 2025) ne sont pas classées.
- **Pour 2027** : cérémonie au Futuroscope (Vienne), donc région hôte = Poitou-Charentes, comme en 2025 où la candidate locale n'avait pas été classée.

Convention retenue et cas discutables : voir `notes.md` (par exemple Orléans 2015, où coexistaient Miss Centre et Miss Orléanais).

## 7. Popularité Instagram et modèles « réseaux sociaux »

[PRESSE] — extraits de recherche, non relus dans le texte intégral. Le classement réel vient de `editions.csv`.

**Nombre d'abonnés Instagram avant l'élection**

| Édition | Classement publié avant l'élection | Résultat réel |
|---|---|---|
| 2019 | Vaimalama Chaves (Tahiti) décrite comme la plus suivie sur Instagram ([purebreak.com](https://www.purebreak.com/news/miss-france-2019-annabelle-varane-vaimalama-chaves-les-5-favorites-du-concours/166243)) | **Gagnante** |
| 2025 | NRJ : 1. Sabah Aïb (Nord-Pas-de-Calais, > 51 100) ; 2. Lilou Émeline-Artuso (Côte d'Azur, > 24 400) ; 3. Marine Futol (Réunion, > 23 400) ; la future gagnante Angélique Angarni-Filopon figurait dans ce top 5 selon NRJ ([nrj.fr](https://www.nrj.fr/actus/people/miss-france-2025-cinq-candidates-qui-ont-le-plus-dabonnes-sur-instagram-71363640)) | Aïb 1re dauphine (et 1re du vote public en finale) ; Émeline-Artuso 4e dauphine ; Futol non classée ; Angarni-Filopon gagnante |
| 2026 | NRJ : 1. Hinaupoko Devèze (Tahiti, 25,7 k) ; 2. Alicia Mertosetiko (Guyane, 24,1 k) ; 3. Lola Lacheré (Nord-Pas-de-Calais, 23,9 k) ; 4. Déborah Adelin-Chabal (Roussillon, 20,7 k) ; 5. Aïnhoa Lahitete (Aquitaine, 18,7 k) ([nrj.fr](https://www.nrj.fr/actus/people/miss-france-2026-quelles-sont-les-5-candidates-les-plus-suivies-sur-instagram-71365655)) ; Purepeople, 3 déc. 2025 : Devèze 1re avec > 25 900 ([purepeople.com](https://www.purepeople.com/article/miss-france-2026-avant-meme-lelection-cette-candidate-est-la-plus-appreciee-du-public_a545227/1)) | Devèze **gagnante** ; Adelin-Chabal 4e dauphine ; Mertosetiko, Lacheré et Lahitete **non classées** |

Lecture prudente (trois éditions seulement) : la candidate la plus suivie a fini 1re (2019, 2026) ou 2e (2025). Le haut du classement Instagram est donc informatif pour la tête de course. Mais le reste du top 5 Instagram est peu fiable : en 2026, 3 des 5 plus suivies n'ont même pas été présélectionnées.

**Modèle AVISIA (cabinet data/IA, analyse d'Instagram, TikTok et X croisée avec démographie et historique des régions)**

| Édition | Favorite AVISIA | Résultat réel |
|---|---|---|
| 2025 | Moïra André (Guadeloupe), « 68 % de chances » ([rci.fm](https://rci.fm/deuxiles/infos/Societe/Selon-lIA-Miss-Guadeloupe-est-la-grande-favorite-de-lelection-de-Miss-France-2025) ; [ozap.com](https://www.ozap.com/actu/miss-france-2025-un-cabinet-specialise-dans-la-data-et-lia-va-tenter-de-predire-les-resultats-a-lavance-grace-a-tiktok-et-aux-reseaux-sociaux/647867)) | 3e dauphine (1re du vote public en demi-finale) |
| 2026 | Lola Lacheré (Nord-Pas-de-Calais), « 67 % » ; top 5 annoncé avec Devèze (Tahiti), Torrent (Guadeloupe), Michel (Île-de-France) ([avisia.fr](https://www.avisia.fr/actualites/blog/data/qui-decrochera-la-couronne-miss-france-2026) ; [europe1.fr](https://www.europe1.fr/culture/voici-qui-sera-couronnee-samedi-prochain-miss-france-2026-dapres-lintelligence-artificielle-873406)) | Lacheré **non classée** ; Devèze gagnante ; Torrent 3e dauphine ; Michel demi-finaliste |

AVISIA affirmait fin 2024 avoir trouvé la gagnante deux fois sur les cinq éditions précédentes et toujours identifié des finalistes (extrait de recherche, éditions concernées non précisées). Sur les deux éditions vérifiables ici, la favorite désignée n'a pas gagné. Le modèle mesure la popularité en ligne, qui ne pèse que sur la moitié « public » et pas du tout sur la présélection.

Des pronostics générés par des assistants IA généralistes ont aussi été relayés (ChatGPT pour 2025 : [dhnet.be](https://www.dhnet.be/medias/television/2024/12/13/voici-qui-sera-la-nouvelle-miss-france-2025selon-lintelligence-artificielle-chatgpt-B4NU57AEAJFDLHCZWZGGMELL5M/) ; plusieurs IA pour 2026 donnaient Lola Lacheré : [officielles.fr](https://www.officielles.fr/people/miss-france-2026-lintelligence-artificielle-donne-son-pronostic-sur-la-future-gagnante/)). Ils n'ont pas de valeur prédictive démontrée.

## 8. Sondages et classements de favorites : se sont-ils réalisés ?

[PRESSE] — extraits de recherche. Aucun sondage d'institut (échantillon représentatif) n'a été trouvé pour aucune édition : il s'agit de votes d'internautes ou de choix de rédactions.

| Édition | Favorite(s) pré-élection et source | Gagnante réelle | La favorite n° 1 a-t-elle gagné ? |
|---|---|---|---|
| 2010-2015 | Rien trouvé | — | Non renseigné |
| 2016 | Rien d'exploitable (une source indique seulement qu'Iris Mittenaere n'avait pas été mise en avant par un magazine TV) | Iris Mittenaere (Nord-Pas-de-Calais) | Non renseigné |
| 2017-2018 | Rien d'exploitable | Alicia Aylies ; Maëva Coucke | Non renseigné |
| 2019 | « 5 favorites » Purebreak dont Vaimalama Chaves et Annabelle Varane ([purebreak.com](https://www.purebreak.com/news/miss-france-2019-annabelle-varane-vaimalama-chaves-les-5-favorites-du-concours/166243)) | Vaimalama Chaves (Tahiti) | Liste sans ordre : gagnante dans la liste ; Varane demi-finaliste |
| 2020 | « 5 favorites » Purebreak dont Lou Ruat (Provence) et Florentine Somers (Nord-Pas-de-Calais) ([purebreak.com](https://www.purebreak.com/news/miss-france-2020-lou-ruat-florentine-somers-les-5-favorites-du-concours/186973)) | Clémence Botino (Guadeloupe), 31,95 % contre 30,66 % pour Lou Ruat | Ruat 1re dauphine ; Somers non classée ; présence de Botino dans la liste non confirmée |
| 2021 | Sondage Instagram officiel Miss France : 1. Lara Gautier (Côte d'Azur, 12 935 votes), 2. April Benayoum (Provence), 3. Lara Lourenço (Île-de-France), 4. Lou-Anne Lorphelin (Bourgogne), 5. Amandine Petit (Normandie) ([demotivateur.fr](https://www.demotivateur.fr/entertainment/miss-france-2021-miss-cote-d-azur-miss-ile-de-france-quelles-sont-les-candidates-favorites-du-public-23489)) | Amandine Petit (5e du sondage) | **Non** — n° 1 du sondage 2e dauphine ; mais 4 des 5 du sondage dans le Top 5 réel |
| 2022 | Purebreak : Charlotte Faure (Rhône-Alpes) « favorite ultime », seule citée dans tous les tops 5 ; Eva Navarro (Provence) citée ([purebreak.com](https://www.purebreak.com/news/miss-france-2022-charlotte-faure-eva-navarro-decouvrez-la-liste-des-5-candidates-favorites/223443)) | Diane Leyre (Île-de-France) | **Non** — Faure demi-finaliste (9e), Navarro non classée |
| 2023 | Sondage TPMP : Marion Navarro (Franche-Comté) 25,8 %, Côte d'Azur 10,9 %, Lorraine 9,8 % ([macommune.info](https://www.macommune.info/miss-franche-comte-grande-favorite-des-internautes-pour-lelection-miss-france-2023)) ; sondage TV Magazine : Indira Ampiot (Guadeloupe) 1re (même source) ; Purebreak : Ampiot et Agathe Cauet parmi 5 favorites ([purebreak.com](https://www.purebreak.com/news/miss-france-2023-indira-ampiot-agathe-cauet-les-5-favorites-pour-le-titre/239934)) | Indira Ampiot (Guadeloupe) | **Partagé** — oui pour TV Magazine, non pour TPMP (Navarro 2e dauphine) |
| 2024 | Purebreak : Normandie, Guadeloupe, Île-de-France, Côte d'Azur ; une IA donnait Karla Bchir (Côte d'Azur) 1re ([purebreak.com](https://www.purebreak.com/news/miss-france-2024-les-estimations-qui-va-gagner-ce-double-indice-quasi-imparable-sur-les-candidates-qui-ont-le-plus-de-chance-d-etre-elue/247574)) | Ève Gilles (Nord-Pas-de-Calais) | **Non** — Guadeloupe 3e dauphine, les trois autres demi-finalistes ; gagnante absente de l'extrait |
| 2025 | AVISIA : Guadeloupe ; Paris Match, Le Parisien, Au Féminin : Tahiti parmi les favorites ([lnc.nc](https://www.lnc.nc/article/pacifique/polynesie-francaise/societe/concours-miss-france-miss-tahiti-parmi-les-favorites-du-parisien-et-de-paris-match-mais-pas-de-l-ia)) | Angélique Angarni-Filopon (Martinique) | **Non** — Guadeloupe 3e dauphine, Tahiti demi-finaliste (13e) |
| 2026 | AVISIA et plusieurs IA : Lola Lacheré ; 7mag : Lorraine, Île-de-France, Tahiti « favorites des médias et internautes » ([7mag.re](https://www.7mag.re/Miss-France-2026-les-favorites-se-devoilent_a20029.html)) ; Instagram : Tahiti 1re | Hinaupoko Devèze (Tahiti) | **Partagé** — non pour AVISIA (favorite non classée), oui pour Instagram et pour une partie de la presse |

Bilan chiffrable (éditions 2021-2026, favorite n° 1 identifiable) : la favorite désignée par une source donnée a gagné dans 2 cas sur 8 (TV Magazine 2023, Instagram 2026) ; elle a fini dans le Top 5 dans 5 cas sur 8. Les listes de favorites contiennent presque toujours une ou deux futures finalistes, rarement la gagnante en première position. Aucun bilan sérieux ne peut être établi avant 2019 faute de sources retrouvées.

## 9. Cotes de bookmakers

**Aucune cote de bookmaker sur l'élection de Miss France n'a été trouvée, pour aucune édition de 2010 à 2027**, malgré plusieurs recherches (opérateurs français, belges, suisses, britanniques). Les mentions de « bookmakers » dans les résultats concernent l'Eurovision ou les concours internationaux (par exemple Iris Mittenaere à Miss Monde/Miss Univers : [deltafm.fr](https://www.deltafm.fr/zik-et-news/bookmakers-iris-mittenaere-remporter-couronne-de-miss-monde)).

L'absence de résultat ne prouve pas qu'aucun opérateur étranger n'en ait jamais proposé ; elle indique seulement qu'aucune n'est repérable par recherche web. Les « 67 % de chances » parfois présentés comme une cote sont le score du modèle AVISIA, pas un marché de paris.

## 10. Ce qu'il faut retenir pour le modèle

1. Modéliser en trois étages : présélection (jury interne), score public, score jury. Les colonnes `demi_pts_public`, `demi_pts_jury`, `finale_pts_public`, `finale_pts_jury` et `finale_pct_public` de `editions.csv` le permettent pour les 17 éditions.
2. Variables les mieux étayées : région (taux de Top 5 et de demi-finale), taille ≥ 175 cm pour la victoire, statut de n° 1 Instagram pour la tête de course.
3. Variables faibles ou en déclin : âge, prix de culture générale (fort jusqu'en 2020, nul depuis), région hôte (utile surtout pour la présélection).
4. Les favoris de la presse et les modèles « réseaux sociaux » sont de bons indicateurs de présence dans le Top 5, de mauvais indicateurs de la gagnante.
5. Taille d'échantillon : 17 gagnantes, 85 finalistes. Tout effet sur la victoire est fragile ; privilégier la cible « Top 5 » ou « demi-finale » pour l'estimation.
