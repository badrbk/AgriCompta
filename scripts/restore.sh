#!/bin/bash
# =============================================================================
# Script de Restauration - Application de Gestion Comptable Agricole
# =============================================================================
# Usage: ./scripts/restore.sh <chemin_archive.tar.gz>
# Exemple: ./scripts/restore.sh ./backups/backup_20240101_120000.tar.gz
# =============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ARCHIVE_FILE="$1"

# Noms des conteneurs Docker (doivent correspondre à docker-compose.yml)
DB_CONTAINER="agri_database"
BACKEND_CONTAINER="agri_backend"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ------------------------------------------------
# Vérifications préliminaires
# ------------------------------------------------
if [ -z "$ARCHIVE_FILE" ]; then
    echo -e "${RED}❌ Usage: $0 <chemin_archive.tar.gz>${NC}"
    echo ""
    echo "Sauvegardes disponibles:"
    ls -lh "$PROJECT_DIR/backups/"*.tar.gz 2>/dev/null || echo "  Aucune sauvegarde trouvée dans $PROJECT_DIR/backups/"
    exit 1
fi

if [ ! -f "$ARCHIVE_FILE" ]; then
    echo -e "${RED}❌ Archive introuvable: $ARCHIVE_FILE${NC}"
    exit 1
fi

# Charger les variables d'environnement
if [ -f "$PROJECT_DIR/.env" ]; then
    # shellcheck disable=SC1091
    source "$PROJECT_DIR/.env"
else
    echo -e "${RED}❌ Fichier .env introuvable.${NC}"
    exit 1
fi

DB_USER="${DB_USER:-agri_user}"
DB_NAME="${DB_NAME:-agri_compta}"

# Vérifier que le conteneur PostgreSQL est en cours d'exécution
if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${DB_CONTAINER}$"; then
    echo -e "${RED}❌ Le conteneur PostgreSQL '${DB_CONTAINER}' n'est pas en cours d'exécution.${NC}"
    echo -e "${YELLOW}   Démarrez d'abord l'application: docker compose up -d${NC}"
    exit 1
fi

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Restauration AgriCompta - $(date '+%d/%m/%Y %H:%M:%S')       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}⚠️  ATTENTION: Cette opération va remplacer TOUTES les données actuelles!${NC}"
echo -e "${YELLOW}   Archive source : $(basename "$ARCHIVE_FILE")${NC}"
echo -e "${YELLOW}   Base de données: ${DB_NAME}${NC}"
echo ""

# Confirmation
read -rp "Êtes-vous sûr de vouloir continuer? (tapez 'OUI' pour confirmer) " CONFIRM
if [ "$CONFIRM" != "OUI" ]; then
    echo -e "${YELLOW}❌ Restauration annulée.${NC}"
    exit 0
fi

# ------------------------------------------------
# 1. Extraire l'archive
# ------------------------------------------------
echo -e "\n${YELLOW}📦 Extraction de l'archive...${NC}"

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

tar -xzf "$ARCHIVE_FILE" -C "$TEMP_DIR"
BACKUP_SUBDIR=$(ls "$TEMP_DIR")
BACKUP_PATH="$TEMP_DIR/$BACKUP_SUBDIR"

if [ ! -d "$BACKUP_PATH" ]; then
    echo -e "${RED}❌ Structure d'archive invalide${NC}"
    exit 1
fi

# Afficher les métadonnées
if [ -f "$BACKUP_PATH/backup_info.json" ]; then
    echo "   Métadonnées de la sauvegarde:"
    cat "$BACKUP_PATH/backup_info.json"
    echo ""
fi

DB_DUMP_FILE="$BACKUP_PATH/database.sql.gz"

if [ ! -f "$DB_DUMP_FILE" ]; then
    echo -e "${RED}❌ Fichier dump base de données introuvable dans l'archive${NC}"
    exit 1
fi

echo -e "   ${GREEN}✅ Archive extraite${NC}"

# ------------------------------------------------
# 2. Arrêter le backend (libérer les connexions DB)
# ------------------------------------------------
echo -e "\n${YELLOW}⏸️  Arrêt du backend (libération des connexions)...${NC}"

cd "$PROJECT_DIR"
docker compose stop backend 2>/dev/null && \
    echo -e "   ${GREEN}✅ Backend arrêté${NC}" || \
    echo -e "   ${YELLOW}⚠️  Backend déjà arrêté${NC}"

# Attendre que les connexions se ferment
sleep 2

# ------------------------------------------------
# 3. Restaurer la base de données
# ------------------------------------------------
echo -e "\n${YELLOW}🗄️  Restauration de la base de données via le conteneur '${DB_CONTAINER}'...${NC}"

# Terminer toutes les connexions actives sur la base de données
echo "   Terminaison des connexions actives..."
docker exec "$DB_CONTAINER" psql \
    -U "$DB_USER" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid <> pg_backend_pid();" \
    > /dev/null 2>&1 || true

# Nettoyer le schéma public (repart de zéro pour éviter les conflits)
echo "   Réinitialisation du schéma public..."
docker exec "$DB_CONTAINER" psql \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO ${DB_USER}; GRANT ALL ON SCHEMA public TO public;" \
    > /dev/null 2>&1

# Restaurer le dump
echo "   Restauration des données..."
RESTORE_ERRORS=$(gzip -cd "$DB_DUMP_FILE" | docker exec -i "$DB_CONTAINER" psql \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    2>&1 | grep -E "^ERROR" || true)

if [ -n "$RESTORE_ERRORS" ]; then
    echo -e "   ${YELLOW}⚠️  Avertissements lors de la restauration:${NC}"
    echo "$RESTORE_ERRORS" | head -5
    echo ""
    echo -e "   ${YELLOW}   (Ces erreurs sont souvent bénignes — vérifiez l'application après le démarrage)${NC}"
else
    echo -e "   ${GREEN}✅ Base de données restaurée sans erreur${NC}"
fi

# ------------------------------------------------
# 4. Restaurer les fichiers uploadés
# ------------------------------------------------
echo -e "\n${YELLOW}📎 Restauration des fichiers uploadés...${NC}"

UPLOADS_ARCHIVE="$BACKUP_PATH/uploads.tar.gz"

if [ -f "$UPLOADS_ARCHIVE" ]; then
    UPLOADS_DEST="$PROJECT_DIR"
    tar -xzf "$UPLOADS_ARCHIVE" -C "$UPLOADS_DEST" 2>/dev/null
    echo -e "   ${GREEN}✅ Fichiers uploadés restaurés${NC}"
else
    echo -e "   ${YELLOW}⚠️  Aucun fichier uploadé dans la sauvegarde (normal si aucun document n'était joint)${NC}"
fi

# ------------------------------------------------
# 5. Redémarrer le backend
# ------------------------------------------------
echo -e "\n${YELLOW}🔄 Redémarrage du backend...${NC}"

docker compose start backend 2>/dev/null && \
    echo -e "   ${GREEN}✅ Backend démarré${NC}" || \
    { echo -e "${RED}❌ Impossible de démarrer le backend. Vérifiez: docker compose logs backend${NC}"; exit 1; }

# Attendre que le backend soit healthy
echo -e "   Attente du démarrage (prisma db push + initialisation)..."
WAIT=0
MAX_WAIT=60
until docker inspect "$BACKEND_CONTAINER" --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; do
    sleep 3
    WAIT=$((WAIT+3))
    if [ "$WAIT" -ge "$MAX_WAIT" ]; then
        echo -e "   ${YELLOW}⚠️  Timeout — vérifiez l'état: docker compose ps${NC}"
        break
    fi
    echo -n "."
done
echo ""

# ------------------------------------------------
# Récapitulatif
# ------------------------------------------------
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  RESTAURATION RÉUSSIE ✅                     ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║ Source: $(printf '%-53s' "$(basename "$ARCHIVE_FILE")") ║${NC}"
echo -e "${GREEN}║ Base de données: $(printf '%-43s' "$DB_NAME") ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "L'application est disponible sur: ${YELLOW}http://localhost:8888${NC}"
