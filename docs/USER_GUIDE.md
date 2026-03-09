# Guide Utilisateur — AgriCompta

## Table des Matières

1. [Premiers Pas](#1-premiers-pas)
2. [Gestion des Projets](#2-gestion-des-projets)
3. [Tableau de Bord](#3-tableau-de-bord)
4. [Transactions Comptables](#4-transactions-comptables)
5. [Immobilisations](#5-immobilisations)
6. [Élevage](#6-élevage)
7. [Cultures et Parcelles](#7-cultures-et-parcelles)
8. [Stocks](#8-stocks)
9. [Ventes et Clients](#9-ventes-et-clients)
10. [Rapports Financiers](#10-rapports-financiers)
11. [Clôture de Saison](#11-clôture-de-saison)
12. [Paramètres](#12-paramètres)
13. [Rôles et Permissions](#13-rôles-et-permissions)

---

## 1. Premiers Pas

### Connexion

Accédez à l'application via votre navigateur à l'adresse fournie par votre administrateur.

- **Installation locale** : http://localhost:8888
- **Serveur dédié** : http://votre-domaine (selon la configuration)

1. Entrez votre **email** et votre **mot de passe**
2. Cliquez sur **Se connecter**
3. En cas de perte de mot de passe, cliquez sur "Mot de passe oublié"

**Comptes de démonstration** (pour tester l'application):
- Admin: `admin@agri.com` / `Admin123!`
- Associé: `associe1@agri.com` / `User123!`

### Interface Principale

L'interface se compose de:
- **Barre latérale gauche**: Navigation principale (s'affiche après sélection d'un projet)
- **Barre supérieure**: Nom de l'utilisateur, notifications, déconnexion
- **Zone centrale**: Contenu de la page active

---

## 2. Gestion des Projets

### Créer un Projet

1. Sur la page d'accueil, cliquez **"Nouveau projet"**
2. Renseignez:
   - **Nom**: Ex. "Ferme Atlas 2024"
   - **Description**: Localisation, type d'activité (optionnel)
   - **Date de démarrage**
3. Validez. Le projet est créé avec la devise MAD par défaut.

### Sélectionner un Projet

Cliquez sur le nom d'un projet dans la liste pour l'ouvrir. La barre de navigation se met à jour avec tous les modules du projet.

### Modifier un Projet

Allez dans **Paramètres → Projet** pour modifier le nom, la description, la devise et le mois de début d'exercice fiscal.

---

## 3. Tableau de Bord

Le tableau de bord affiche une synthèse en temps réel du projet:

| Indicateur | Description |
|-----------|-------------|
| Trésorerie | Solde total de tous les comptes de cash |
| Capital Total | Somme des apports des associés |
| Valeur des Stocks | Valorisation CUMP de tous les stocks |
| Résultat Prévisionnel | Produits - Charges calculés jusqu'à aujourd'hui |

**Graphiques:**
- **Évolution mensuelle**: Courbes des revenus et dépenses par mois
- **Répartition des associés**: Part de chaque associé (graphique camembert)

**Dernières transactions**: Liste des 10 dernières opérations enregistrées.

---

## 4. Transactions Comptables

### Enregistrer une Transaction

1. Menu **Transactions → Nouvelle transaction**
2. Renseignez:
   - **Date**: Date de l'opération
   - **Compte comptable**: Sélectionnez dans le plan comptable (ex: "611 - Achats de semences")
   - **Type**: EXPENSE (charge), SALE (vente), CAPITAL_ACQUISITION (achat d'immobilisation), etc.
   - **Montant**: En MAD
   - **Description**: Libellé de l'opération
   - **Mode de paiement**: Espèces, Virement, Chèque, Crédit
   - **Référence document**: N° de facture ou pièce justificative (optionnel)
   - **Associé payeur**: L'associé qui a avancé le montant (optionnel)
   - **Compte de trésorerie**: Pour mise à jour automatique du solde

3. Vous pouvez joindre une pièce justificative (PDF, JPG, max 10 Mo)

### Types de Transactions

| Type | Usage |
|------|-------|
| EXPENSE | Charge courante (semences, engrais, main-d'œuvre...) |
| SALE | Produit de vente |
| CAPITAL_ACQUISITION | Achat d'une immobilisation |
| CAPITAL_CONTRIBUTION | Apport en capital d'un associé |
| STOCK_IN | Entrée en stock |
| STOCK_OUT | Sortie de stock |
| DISTRIBUTION | Versement de bénéfices |

### Filtrer et Rechercher

Utilisez les filtres en haut de la liste pour:
- Filtrer par **période** (date de début / fin)
- Filtrer par **type** de transaction
- Rechercher par **description**

---

## 5. Immobilisations

Les immobilisations sont les actifs durables de l'exploitation (matériel, véhicules, bâtiments, terres...).

### Enregistrer une Immobilisation

1. Menu **Immobilisations → Nouvelle immobilisation**
2. Renseignez:
   - **Nom**: Ex. "Tracteur John Deere 5090E"
   - **Catégorie**: Terrain, Bâtiment, Matériel, Véhicule, Cheptel, Installation
   - **Date d'acquisition** et **Valeur d'acquisition**
   - **Méthode d'amortissement**: Linéaire ou Dégressif
   - **Durée de vie utile**: En années
   - **Valeur résiduelle**: Valeur estimée en fin de vie
   - **Localisation** et **N° de série** (optionnel)

### Calcul des Amortissements

**Méthode Linéaire:**
```
Dotation annuelle = (Valeur d'acquisition - Valeur résiduelle) / Durée de vie
```

**Méthode Dégressive (CNCA marocain):**
```
Coefficient: 1.5 (durée ≤ 3 ans), 2.0 (4-5 ans), 2.5 (> 5 ans)
Taux dégressif = (1 / Durée) × Coefficient
Dotation = Valeur nette comptable × Taux dégressif
```

Pour calculer et enregistrer l'amortissement:
1. Ouvrez la fiche d'une immobilisation
2. Cliquez **"Calculer amortissement"**
3. Sélectionnez l'année
4. L'application calcule et enregistre la dotation

---

## 6. Élevage

### Créer un Groupe d'Animaux

1. Menu **Élevage → Nouveau groupe**
2. Type: **Élevage** (reproduction) ou **Engraissement**
3. Renseignez l'espèce, la race, l'effectif initial, le poids moyen, la valeur unitaire et la date d'acquisition

### Enregistrer des Mouvements

Sur la fiche d'un groupe, ajoutez des mouvements:
- **BIRTH** (naissance): augmente l'effectif
- **PURCHASE** (achat): augmente l'effectif
- **SALE** (vente): diminue l'effectif, enregistrez le prix
- **DEATH** (mort): diminue l'effectif
- **TRANSFER**: mouvement entre groupes

### Enregistrer des Charges

Charges d'élevage à saisir:
- **FEED**: Alimentation (foin, concentré, orge...)
- **VETERINARY**: Frais vétérinaires, médicaments, vaccins
- **LABOR**: Main-d'œuvre dédiée à l'élevage
- **OTHER**: Autres charges

### Analyser la Performance

Le rapport **Analyse du Cheptel** (menu Rapports) calcule:
- Valeur actuelle du cheptel
- Total des charges par groupe
- Revenus générés (ventes)
- ROI = (Revenus - Charges) / Valeur initiale × 100

---

## 7. Cultures et Parcelles

### Gérer les Parcelles

1. Menu **Cultures → Parcelles**
2. Créez chaque parcelle avec:
   - **Nom** et **superficie** (hectares ou m²)
   - **Type de sol** et **type d'irrigation**
   - **Localisation** (coordonnées GPS optionnel)

### Suivi des Cultures

1. Menu **Cultures → Liste des cultures**
2. Créez une nouvelle culture:
   - Sélectionnez la **parcelle**
   - **Type de culture** et **variété**
   - **Dates** de plantation et récolte prévue
   - **Surface plantée**

**Statuts des cultures:**
- PLANNED → PLANTED → GROWING → HARVESTED (ou FAILED)

### Enregistrer une Récolte

Sur la fiche d'une culture:
1. Cliquez **"Ajouter une récolte"**
2. Renseignez la quantité, l'unité (kg/tonne/quintal), la qualité (A/B/C) et la destination (Stock/Vente directe/Perte)

### Charges de Culture

Enregistrez les dépenses par culture:
- SEED (semences), FERTILIZER (engrais), PESTICIDE (phytosanitaires)
- IRRIGATION (eau), LABOR (main-d'œuvre), OTHER

---

## 8. Stocks

### Créer un Article en Stock

1. Menu **Stocks → Nouveau stock**
2. Catégories:
   - **HARVEST**: Productions récoltées (blé, tomates, olives...)
   - **LIVESTOCK**: Animaux à l'engraissement
   - **CONSUMABLE**: Intrants (semences, engrais, carburant...)
3. Définissez l'unité, la valeur unitaire initiale et le seuil d'alerte minimal

### Valorisation CUMP

La valorisation utilise le **Coût Unitaire Moyen Pondéré (CUMP)**:

```
Nouveau CUMP = (Qté actuelle × CUMP actuel + Qté entrée × Coût entrée)
               ÷ (Qté actuelle + Qté entrée)
```

Le CUMP se recalcule automatiquement à chaque entrée en stock.

### Mouvements de Stock

Sur la fiche d'un article:
- **Entrée (IN)**: Ajout de stock avec coût unitaire
- **Sortie (OUT)**: Retrait de stock (vente, consommation, perte...)

Les sorties déduisent la quantité au CUMP actuel.

### Alertes Stock Faible

Les articles dont la quantité est inférieure au seuil minimal apparaissent en orange dans la liste des stocks.

---

## 9. Ventes et Clients

### Gérer les Clients

Menu **Ventes → Clients**:
- Ajoutez clients particuliers ou sociétés
- Renseignez coordonnées et conditions de paiement

### Créer une Vente

1. Menu **Ventes → Nouvelle vente**
2. Sélectionnez le client (optionnel pour ventes au comptant anonymes)
3. Ajoutez des **lignes de vente**:
   - Sélectionnez un article en stock (optionnel)
   - Nom du produit, quantité, unité, prix unitaire
   - Le total se calcule automatiquement
4. Renseignez le **mode de paiement** et le **statut** (Payé/Partiel/Impayé)
5. Pour paiement partiel, indiquez le **montant payé**

### Suivi des Encaissements

La liste des ventes affiche le statut de paiement avec code couleur:
- 🟢 PAID: Facture entièrement réglée
- 🟡 PARTIAL: Paiement partiel
- 🔴 UNPAID: Impayée

---

## 10. Rapports Financiers

### Compte de Résultat

Menu **Rapports → Compte de Résultat**

Sélectionnez la période et cliquez **Actualiser**. Le rapport affiche:
- **Produits** (Classe 7): Par compte, avec totaux
- **Charges** (Classe 6): Par compte, dont amortissements
- **Résultat Net** = Produits - Charges - Amortissements

Exportez en CSV avec le bouton **Exporter CSV**.

### Bilan

Menu **Rapports → Bilan**

Sélectionnez la date de référence. Le bilan présente:
- **Actif**: Immobilisations nettes, Stocks (CUMP), Trésorerie
- **Passif**: Capital des associés, Résultat

Un message confirme si le bilan est équilibré (Actif = Passif).

### Flux de Trésorerie

Menu **Rapports → Flux de Trésorerie**

Filtre par période. Affiche:
- Tous les mouvements de cash par compte
- Graphique d'évolution mensuelle entrées/sorties
- Solde d'ouverture et de clôture

### Analyses Sectorielles

- **Analyse des Cultures**: Rendements (kg/ha), coût de production (DH/kg), CA, marge et taux de marge par culture
- **Analyse du Cheptel**: Valeur, charges, revenus et ROI par groupe d'animaux

---

## 11. Clôture de Saison

La clôture permet d'arrêter les comptes d'une saison agricole, calculer le résultat et répartir les bénéfices entre associés.

### Processus en 5 Étapes

#### Étape 1 — Créer la Clôture (Brouillon)

Menu **Clôtures → Nouvelle clôture**:
1. Donnez un nom à la saison (ex: "Saison 2024-2025")
2. Date de clôture
3. Notes éventuelles
4. Cliquez **Créer**

L'application calcule automatiquement:
- **Total Produits** = Somme de toutes les transactions de produits (classe 7)
- **Total Charges** = Somme de toutes les transactions de charges (classe 6)
- **Amortissements** = Somme des dotations aux amortissements enregistrées
- **Résultat Net** = Produits - Charges - Amortissements

#### Étape 2 — Valider la Clôture

Réservé aux rôles **Administrateur** et **Comptable**.

1. Ouvrez la clôture (statut: Brouillon)
2. Cliquez **Valider**
3. Confirmez la validation

À la validation:
- Le résultat est figé (plus modifiable)
- Les distributions sont calculées pour chaque associé actif selon son % de participation

**Exemple**: Si résultat net = 120 000 DH et un associé a 35% → sa part = 42 000 DH

#### Étape 3 — Configurer la Distribution

Sur la clôture validée, cliquez **Distribuer** pour configurer le versement pour chaque associé:

| Méthode | Description |
|---------|-------------|
| CASH | Versement intégral en espèces/virement |
| REINVEST | Réinvestissement intégral dans le projet |
| MIXED | Partage entre versement et réinvestissement |

Pour chaque associé, indiquez:
- La méthode de distribution
- Les montants (espèces et/ou réinvestissement)
- La date de paiement prévue

#### Étape 4 — Enregistrer

Cliquez **Enregistrer la distribution**. La clôture passe en statut **DISTRIBUTED**.

### Statuts

| Statut | Signification |
|--------|--------------|
| BROUILLON | Calculée, en attente de validation |
| VALIDÉE | Validée, distributions calculées |
| DISTRIBUÉE | Bénéfices versés aux associés |

---

## 12. Paramètres

### Paramètres du Projet

Menu **Paramètres → Projet**:
- Modifier le nom et la description du projet
- Changer la devise (MAD, EUR, USD, XOF, DZD, TND)
- Définir le mois de début d'exercice fiscal

### Gestion des Associés

Menu **Paramètres → Associés**:
- Visualiser la répartition des participations (barre de progression)
- Ajouter un associé (nécessite son ID utilisateur)
- Activer/désactiver un associé
- Supprimer un associé (irréversible)

> **Important**: Le total des participations ne doit pas dépasser 100%. Si la somme fait exactement 100%, le bilan est équilibré.

### Plan Comptable

Menu **Comptes** (accessible depuis le menu principal):
- Consulter tous les comptes organisés par classe (2, 3, 5, 6, 7)
- Rechercher un compte par code ou libellé
- Créer un nouveau compte avec son code et sa classe

Le plan comptable marocain agricole est pré-chargé avec les données de démonstration.

### Mon Profil

Menu **Profil** (icône utilisateur en haut à droite):
- Modifier prénom, nom, email
- Changer le mot de passe (nécessite le mot de passe actuel)

---

## 13. Rôles et Permissions

| Fonctionnalité | Admin | Comptable | Associé | Observateur |
|----------------|:-----:|:---------:|:-------:|:-----------:|
| Lire les rapports | ✅ | ✅ | ✅ | ✅ |
| Créer des transactions | ✅ | ✅ | ✅ | ❌ |
| Modifier des transactions | ✅ | ✅ | ❌ | ❌ |
| Supprimer des transactions | ✅ | ❌ | ❌ | ❌ |
| Gérer les immobilisations | ✅ | ✅ | ❌ | ❌ |
| Gérer les cultures/élevage | ✅ | ✅ | ✅ | ❌ |
| Créer une clôture | ✅ | ✅ | ❌ | ❌ |
| **Valider** une clôture | ✅ | ✅ | ❌ | ❌ |
| Gérer les associés | ✅ | ❌ | ❌ | ❌ |
| Gérer les utilisateurs | ✅ | ❌ | ❌ | ❌ |
| Gérer le plan comptable | ✅ | ❌ | ❌ | ❌ |

---

## Conseils et Bonnes Pratiques

**Organisation quotidienne:**
- Enregistrez les transactions au jour le jour pour éviter les oublis
- Joignez systématiquement les pièces justificatives (factures, bons de livraison)
- Vérifiez régulièrement le tableau de bord pour suivre la trésorerie

**En fin de saison:**
1. Vérifiez que toutes les récoltes sont enregistrées dans les stocks
2. Calculez les amortissements de l'année pour chaque immobilisation
3. Faites un inventaire physique des stocks et corrigez les écarts
4. Effectuez la clôture de saison

**Sauvegardes:**
- Lancez le script de sauvegarde avant toute clôture importante
- Conservez plusieurs copies de sauvegarde (locale + cloud)

---

*Pour signaler un problème ou demander de l'aide, contactez votre administrateur système.*
