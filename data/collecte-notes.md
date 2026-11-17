# Notes de collecte — Miss France 2027

Relevé du 17 novembre 2026.

## Limite majeure : aucune page n'a pu être lue directement

L'environnement réseau de la session (« Trajets ») n'autorise aucun des sites utiles. `curl`, Playwright et WebFetch ont tous été refusés (403 du proxy / hôte non résolu) pour : sudouest.fr (article de départ), fr.wikipedia.org, missfrance.fr, tf1.fr, tf1info.fr, programme-tv.net, purepeople.com, ozap.com, divertissements.orange.fr, leparisien.fr, ouest-france.fr, francebleu.fr, instagram.com, web.archive.org, etc. La création d'un environnement dédié avec ces hôtes a été proposée et rejetée par le service.

Toute la collecte repose donc sur **des extraits de moteur de recherche (WebSearch)**, c'est-à-dire des résumés de pages et non les pages elles-mêmes. Conséquences :

- Les faits sont recoupés quand plusieurs extraits concordent, mais aucun n'a été vérifié à la source.
- **Aucune URL directe d'image n'a pu être relevée ni vérifiée (HTTP 200 / content-type).** Dans `candidates.json`, chaque entrée `photos` a `url: null` et un `source_page` : la page où la photo se trouve (galeries de portraits officiels Sud Ouest / Planet.fr / CGTV, articles d'élection régionale). L'objectif de 4 à 8 photos vérifiées par candidate n'est pas atteint (0 URL directe).
- Les URL de `sources` proviennent des résultats de recherche ; elles n'ont pas été ouvertes.

Pour compléter : autoriser dans les réglages réseau au minimum www.sudouest.fr, fr.wikipedia.org, www.missfrance.fr, www.tf1info.fr, www.planet.fr, www.cg-tv.com, www.ici.fr, la1ere.franceinfo.fr, france3-regions.franceinfo.fr, www.ouest-france.fr et leurs CDN d'images, puis relancer la collecte des photos.

## Ce qui manque

- `date_naissance` : 0/31 (seule déduction : Candice Gauch a eu 29 ans le 7 août 2026, jour de son élection).
- `couleur_cheveux`, `couleur_yeux` : 0/31 (non mentionnées dans les textes ; à relever sur les portraits).
- `instagram` : 3/31 identifiants (Alsace, Corse, Limousin), non vérifiés, aucun nombre d'abonnés. Un article Yahoo indique seulement « plusieurs milliers, voire plus d'une dizaine de milliers » d'abonnés selon les candidates.
- `passions` 5/31, `cause_defendue` 6/31.
- `etudes_profession` manquant : Champagne-Ardenne, Lorraine, Martinique, Provence, Saint-Martin/Saint-Barthélemy.
- `lieu_election_regionale` manquant : Saint-Martin/Saint-Barthélemy. Salle précise inconnue pour Bretagne (Brest), Côte d'Azur (Fréjus), Languedoc (Beaucaire), Limousin (Aubusson), Centre-Val de Loire (Dreux), Pays de la Loire (Vallet), Franche-Comté (Port-sur-Saône).
- Événement : heure de diffusion, présidence et composition du jury, règles de vote 2027 (nombre de demi-finalistes/finalistes, part public/jury), dates du voyage à Saint-Martin, date et résultats du test de culture générale.

## Ce qui est incertain

- **Âges** : varient d'un an selon les sources (âge à l'élection régionale ou à la date des portraits). Divergences : Alsace (23/24), Centre-Val de Loire (25/26), Île-de-France (23/24), Normandie (21/22), Nouvelle-Calédonie (17/18), Poitou-Charentes (37/38), Provence (27/28), Réunion (20/21), Roussillon (22/23). La valeur retenue est celle des articles sur les portraits officiels quand elle existe, sinon celle de la presse régionale.
- **Tailles** : Aquitaine (1,73 ou 1,75 m), Mayotte (1,76 ou 1,74 m), Rhône-Alpes (1,74 ou 1,75 m). Tailles issues du seul Wikipédia EN : Bourgogne, Champagne-Ardenne, Corse, Côte d'Azur, Franche-Comté, Guadeloupe, Guyane, Languedoc, Lorraine, Nouvelle-Calédonie, Pays de la Loire, Poitou-Charentes, Réunion, Saint-Martin, Tahiti.
- **Dates d'élection** : Corse (23 juillet selon Wikipédia, jour de la semaine discordant dans la presse), Martinique (13 ou 14 juin), Normandie (21 ou 22 mai), Lorraine (12 septembre, résultat relayé le 13), Réunion (22 août ; La 1ère écrit « samedi 23 août »).
- **Aquitaine** : titre antérieur discordant (1re dauphine Miss Bordeaux 2023 ou 1re dauphine d'une Miss Aquitaine antérieure).
- **Orthographes** : Laetitia/Laëtitia Roguet ; Grid-Costantino/Grid-Constantino ; Lucéa-Merlin/Lucea-Merlin.
- **Événement** : thème « Les Miss et la mode » et présentateur Jean-Pierre Foucault reposent chacun sur un extrait unique. « 20h00 » vient de la page de la salle, pas de TF1.

## Sources uniques ou peu fiables à traiter avec prudence

- **Saint-Martin/Saint-Barthélemy (Naïla Parotte)** : toute la fiche vient de Wikipédia (EN/FR), aucune presse locale trouvée.
- **Champagne-Ardenne (Céline Leduc)** : âge, taille, commune via Wikipédia EN uniquement.
- pronomiss.com (profession de Justine Bourrelier), stephanelarue.com (profession de Sandra Justine), beninwebtv.bj (passé en fauteuil roulant de Juliette Gauthier), viralmag.fr (favorites, thème) : sites non officiels, source unique.
- Wikipédia EN « Miss France 2027 » et pages régionales : décrites comme ébauches, avec au moins une erreur repérée (page Miss Rhône-Alpes).
- Une page de la ville de Pornichet présente « Lola Winter, Miss Pays de la Loire 2026 » : contredite par toutes les autres sources, écartée.

## Liste des 31

La liste des 31 noms est concordante entre Yahoo Actualités, CNews, Wikipédia EN et TNTV. Régions : 22 métropolitaines « historiques » + Corse, Guadeloupe, Guyane, Martinique, Mayotte, Nouvelle-Calédonie, Réunion, Saint-Martin/Saint-Barthélemy, Tahiti. Pas de Wallis-et-Futuna ni de Saint-Pierre-et-Miquelon.
