# Prospection restaurants → rendez-vous automatique

Workflow n8n complet : il scanne les restaurants d'une zone, qualifie chaque prospect,
rédige une offre personnalisée, et programme le rendez-vous dès qu'une réponse est positive.

27 nœuds, deux déclencheurs, aucune clé API en dur.

---

## Prérequis

| Service | Pourquoi | Coût |
|---|---|---|
| n8n | héberge le workflow | cloud ou auto-hébergé |
| Apify | scanne Google Maps | à l'usage, crédit requis |
| OpenAI | qualification + rédaction | à l'usage, crédit requis |
| Google | Gmail, Sheets, Calendar | gratuit |

Créez aussi un Google Sheet de suivi avec **deux onglets** nommés exactement
`Prospects` et `Réponses`.

---

## Installation

1. **Importer** : dans n8n, `Workflows → Import from File`, sélectionnez le JSON.

2. **Credential Apify** — c'est la seule qui demande un réglage manuel.
   Type **Header Auth** :
   - Nom : `Authorization`
   - Valeur : `Bearer VOTRE_TOKEN_APIFY`

3. **Autres credentials** : branchez OpenAI, Gmail, Google Sheets et Google Calendar
   sur les nœuds correspondants.

4. **Paramètres de prospection** (nœud Set, branche du haut) :
   - `zone` — la zone ciblée, ex. `Saint-Denis, La Reunion`
   - `requete` — le type d'établissement, ex. `restaurant`
   - `maxProspects` — nombre de fiches par exécution
   - `scoreMini` — score minimum pour déclencher l'envoi (défaut : 6)

5. **Paramètres des réponses** (nœud Set, branche du bas) :
   - `emailAlerte` — l'adresse qui reçoit les questions à traiter à la main.
     **Ce champ est vide par défaut, il faut le remplir.**

6. **Sélectionner vos ressources Google** : l'agenda dans `Créer le rendez-vous`,
   et le document dans les deux nœuds Google Sheets.

---

## Tester avant d'activer

> Ce workflow envoie de vrais emails à de vrais établissements et crée de vrais
> rendez-vous. Ne l'activez pas sans test.

1. Mettez `maxProspects` à `1`.
2. Dans `Envoyer l'offre`, remplacez temporairement le destinataire par votre propre adresse.
3. Lancez `Execute Workflow` à la main et lisez l'email généré.
4. Quand le contenu vous convient, remettez le destinataire d'origine et activez.

---

## Comment ça marche

### Branche 1 — prospection (tous les jours à 8h)

```
Scan quotidien 08h
  → Paramètres de prospection
  → Scanner les restaurants (Apify / Google Maps)
  → Normaliser les fiches
  → Garder les fiches contactables      ← écarte celles sans email
  → Lire le site du restaurant
  → Qualifier le prospect (IA, score 1-10)
  → Score suffisant ?
  → Rédiger l'offre personnalisée (IA)
  → Envoyer l'offre (Gmail)
  → Journaliser le prospect (Sheets)
```

### Branche 2 — réponses (toutes les 15 min)

```
Réponses entrantes (Gmail)
  → Paramètres des réponses
  → Classer la réponse (IA : INTERESSE / QUESTION / REFUS)
  → Router selon l'intention
       ├─ INTERESSE → Créer le rendez-vous → Confirmer le rendez-vous
       ├─ QUESTION  → Alerter pour réponse manuelle
       ├─ REFUS     → Journaliser l'issue
       └─ ambigu    → Alerter pour réponse manuelle
```

---

## Choix de conception

**Le doute penche vers l'humain.** En cas d'hésitation entre « intéressé » et
« question », l'IA classe en question et vous alerte. Un rendez-vous créé à tort
coûte plus cher qu'une relance manuelle.

**Les fiches sans email sont écartées.** Google Maps n'en fournit presque jamais.
L'option `scrapeContacts` d'Apify est activée, et les fiches sans email sont ignorées
plutôt que d'envoyer dans le vide.

**Rien ne se perd en silence.** Chaque branche du routeur mène à une action :
journalisation ou alerte. Y compris le cas non classé.

**Les envois ne bloquent pas la chaîne.** Les nœuds Gmail et Sheets sont en
`continueRegularOutput` : si un envoi échoue, les prospects suivants sont traités
quand même.

---

## Adapter à un autre métier

Rien n'est spécifique à la restauration. Changez :

- `requete` dans **Paramètres de prospection** (`salon de coiffure`, `garage`…)
- le *system message* des agents `Qualifier le prospect` et `Rédiger l'offre personnalisée`

Le réglage le plus utile au quotidien reste `scoreMini` : montez-le si vous recevez
trop de prospects faibles.

---

## Dépannage

| Symptôme | Cause probable |
|---|---|
| `Unsupported parameter: temperature` | modèle de raisonnement ; laissez `options` vide sur les nœuds modèle |
| `Insufficient quota` | plus de crédit sur le compte OpenAI |
| Aucun prospect en sortie | aucune fiche avec email trouvée — élargissez la zone ou augmentez `maxProspects` |
| Le RDV n'est pas créé | l'agenda n'est pas sélectionné dans `Créer le rendez-vous` |
| Pas d'alerte reçue | `emailAlerte` est vide dans **Paramètres des réponses** |

---

AutomationBoost — https://automatisationboost.com
