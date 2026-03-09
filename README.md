# AgriCompta — Application de Gestion Comptable Agricole

Plateforme complète de gestion comptable pour exploitations agricoles collectives. Suivi des cultures, élevage, stocks, ventes, immobilisations, trésorerie et clôtures de saison avec répartition automatique des bénéfices entre associés.

## Démarrage rapide (4 commandes)

```bash
cp .env.example .env                   # 1. Copier la configuration
nano .env                              # 2. Définir DB_PASSWORD et JWT_SECRET
docker compose build                   # 3. Construire les images
docker compose up -d                   # 4. Lancer l'application
```

Accès (installation locale par défaut) :
- **Application** : http://localhost:8888
- **API REST** : http://localhost:8888/api
- **Documentation API** : http://localhost:8888/api/docs

> **Port 80 occupé ?** Le port d'exposition est configuré dans `.env` via `APP_PORT` (défaut : 8888).
> Si vous êtes en production derrière un reverse proxy, vous pouvez passer à 80 en modifiant `docker-compose.yml`.

### Charger les données de démonstration

```bash
docker compose exec backend node /app/dist/seed.js
```

---

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Administrateur | admin@agri.com | Admin123! |
| Comptable | comptable@agri.com | User123! |
| Associé 1 | associe1@agri.com | User123! |
| Associé 2 | associe2@agri.com | User123! |
| Observateur | observateur@agri.com | User123! |

Projet de démo : **"Ferme Atlas - Saison 2024"** (ID: `demo-project-001`)

---

## Architecture

```
agri-compta/
├── backend/                # API Node.js + Express + TypeScript
│   ├── prisma/             # Schéma Prisma + seed.ts
│   ├── src/
│   │   ├── routes/         # 13 modules de routes
│   │   ├── middleware/     # Auth JWT, gestion erreurs, upload
│   │   └── utils/          # Logger, Prisma client, JWT, Swagger
│   └── Dockerfile
├── frontend/               # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── pages/          # 35+ pages organisées par module
│   │   ├── components/     # Layout, cartes, modales
│   │   ├── services/       # Axios + tous les services API
│   │   ├── store/          # Zustand (auth + projets)
│   │   └── utils/          # Formateurs, helpers
│   └── Dockerfile
├── nginx/                  # Reverse proxy + configuration SPA
├── scripts/                # backup.sh + restore.sh
├── docker-compose.yml
└── .env.example
```

### Services Docker

| Service | Image | Port interne | Rôle |
|---------|-------|-------------|------|
| database | postgres:15-alpine | 5432 | PostgreSQL |
| backend | node:20-alpine | 3000 | API Express |
| frontend | nginx:alpine | 80 | App React compilée |
| nginx | nginx:alpine | 80 → **8888** (hôte) | Reverse proxy |

> Le schéma de base de données est synchronisé automatiquement au démarrage via `prisma db push`.

---

## Fonctionnalités

### Gestion des Projets
- Multi-projets par organisation
- Gestion des associés avec % de participation
- Tableau de bord avec KPIs en temps réel

### Comptabilité
- Plan comptable marocain (classes 2, 3, 5, 6, 7)
- Saisie des transactions avec pièces justificatives
- Gestion de la trésorerie multi-comptes (caisse, banque, mobile money)

### Immobilisations
- Enregistrement des actifs (terrain, bâtiment, matériel, véhicule, cheptel)
- Calcul automatique des amortissements (linéaire et dégressif CNCA)
- Suivi de la valeur nette comptable

### Stocks
- Gestion multi-articles (récoltes, consommables, bétail)
- Valorisation CUMP automatique
- Alertes de seuil minimal
- Traçabilité des mouvements

### Cultures
- Gestion des parcelles avec caractéristiques (surface, sol, irrigation)
- Suivi des cultures de la plantation à la récolte
- Enregistrement des récoltes avec qualité et destination
- Analyse des coûts, rendements et marges par culture

### Élevage
- Groupes d'animaux (élevage/engraissement)
- Mouvements (achats, ventes, naissances, décès, transferts)
- Charges d'élevage (alimentation, vétérinaire, travail)
- Calcul du ROI par groupe

### Ventes
- Facturation avec lignes de vente
- Gestion des clients (particuliers et sociétés)
- Suivi des paiements (payé/partiel/impayé)
- Lien automatique avec les stocks

### Rapports Financiers
- **Compte de résultat** : Produits, charges, amortissements, résultat net
- **Bilan** : Actif (immobilisations, stocks, trésorerie) = Passif (capitaux propres)
- **Flux de trésorerie** : Mouvements cash avec graphiques mensuels
- **Analyse des cultures** : Rendements, coûts, marges par culture
- **Analyse du cheptel** : Performance et ROI par groupe

### Clôture de Saison
- Calcul automatique du résultat (produits - charges - amortissements)
- Validation par administrateur ou comptable
- Répartition automatique selon les % de participation
- Distribution configurable (espèces, réinvestissement, mixte)

---

## Variables d'environnement

```env
# Base de données
DB_USER=agri_user
DB_PASSWORD=CHANGER_EN_PROD          # ⚠️ À modifier impérativement
DB_NAME=agri_compta
DB_PORT=5432

# Authentification
JWT_SECRET=chaine-aleatoire-min-32-chars   # ⚠️ À modifier impérativement
JWT_EXPIRATION=7d

# Application
API_PORT=3000
NODE_ENV=production
VITE_API_URL=http://localhost:8888/api     # Adapter si domaine personnalisé
TIMEZONE=Africa/Casablanca
CURRENCY=MAD
```

> Pour changer le port d'exposition, modifiez la section `ports` du service `nginx` dans `docker-compose.yml` (`"8888:80"` → `"80:80"` par exemple).

---

## Commandes utiles

```bash
# Construire les images
docker compose build

# Démarrer
docker compose up -d

# Voir les logs en temps réel
docker compose logs -f backend
docker compose logs -f frontend

# Statut des conteneurs
docker compose ps

# Initialiser les données de démonstration (première installation)
docker compose exec backend node /app/dist/seed.js

# Créer une sauvegarde (l'application doit être démarrée)
./scripts/backup.sh sauvegarde-manuelle

# Restaurer une sauvegarde
# ⚠️  Les conteneurs doivent être en cours d'exécution avant la restauration
# Le script arrête automatiquement le backend, restaure, puis le redémarre
./scripts/restore.sh ./backups/sauvegarde-manuelle_20240101_120000.tar.gz

# Arrêter
docker compose down

# Arrêter et supprimer toutes les données (⚠️ irréversible)
docker compose down -v
```

---

## Développement local

```bash
# Backend
cd backend
npm install
cp ../.env.example .env
# Démarrer PostgreSQL (Docker ou local)
npx prisma db push           # Synchronise le schéma (remplace migrate dev)
node dist/seed.js            # Ou : npm run seed (avec ts-node en dev)
npm run dev                  # http://localhost:3000

# Frontend (autre terminal)
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

> En développement, `VITE_API_URL` peut être omis — Vite proxie `/api` vers `localhost:3000` si configuré dans `vite.config.ts`.

---

## Notes techniques importantes

| Sujet | Détail |
|-------|--------|
| Schéma DB | `prisma db push` au démarrage (pas de migrations — adapté au mode démo) |
| Binaires Prisma | `linux-musl-openssl-3.0.x` inclus pour Alpine Linux |
| OpenSSL | Installé dans les deux stages Docker (`apk add openssl`) |
| Peer deps | `npm install --legacy-peer-deps` requis (date-fns-tz 3.x) |
| Port | 8888 par défaut (port 80 souvent réservé par Docker Desktop sur macOS) |
| Seed | Pré-compilé dans l'image à `dist/seed.js` |

---

## Stack technique

**Backend**
- Node.js 20 + Express 4 + TypeScript
- PostgreSQL 15 + Prisma ORM 5.22
- JWT (7j) + bcrypt (salt 12) + Zod + Winston + Swagger/OpenAPI
- Multer (upload) + Helmet + CORS + Rate limiting

**Frontend**
- React 18 + TypeScript + Vite 5
- Tailwind CSS + CSS custom properties
- Zustand (state management, persisté en localStorage)
- React Hook Form + Zod (validation)
- Axios + intercepteurs JWT automatiques
- Recharts (graphiques) + React Router v6
- date-fns (fr) + Lucide React (icônes)

**Infrastructure**
- Docker + Docker Compose
- Nginx (reverse proxy + SPA routing + gzip + cache statique)
- Multi-stage builds (images allégées, ~200 Mo backend)
- Healthchecks + dépendances entre services

---

## Sécurité

- Mots de passe hashés avec bcrypt (salt rounds: 12)
- Tokens JWT avec expiration courte (7j)
- HTTPS recommandé en production (configurer Nginx + certificat SSL/Let's Encrypt)
- Rate limiting sur les routes d'authentification (10 req/15min)
- Validation stricte de toutes les entrées avec Zod
- Variables d'environnement pour tous les secrets (jamais dans le code)

---

## Licence

Usage personnel et commercial autorisé. Voir LICENSE pour les détails.
