#!/bin/bash
# =============================================================================
# Script de Sauvegarde - Application de Gestion Comptable Agricole
# =============================================================================
# Usage: ./scripts/backup.sh [nom_backup]
# Exemple: ./scripts/backup.sh sauvegarde-avant-cloture
# =============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="${1:-backup}_$TIMESTAMP"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Charger les variables d'environnement
if [ -f "$PROJECT_DIR/.env" ]; then
    source "$PROJECT_DIR/.env"
else
    echo -e "${RED}❌ Fichier .env introuvable. Copiez .env.example vers .env${NC}"
    exit 1
fi

# Valeurs par défaut
DB_USER="${DB_USER:-agri_user}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-agri_compta}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Sauvegarde AgriCompta - $(date '+%d/%m/%Y %H:%M:%S')         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Créer le répertoire de sauvegarde
mkdir -p "$BACKUP_PATH"
echo -e "${YELLOW}📁 Répertoire de sauvegarde: $BACKUP_PATH${NC}"

# ------------------------------------------------
# 1. Sauvegarde de la base de données
# ------------------------------------------------
echo -e "\n${YELLOW}🗄️  Sauvegarde de la base de données PostgreSQL...${NC}"

DB_DUMP_FILE="$BACKUP_PATH/database.sql.gz"

# Nom du conteneur PostgreSQL (doit correspondre à container_name dans docker-compose.yml)
DB_CONTAINER="agri_database"

# Vérifier si le conteneur Docker est en cours d'exécution
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${DB_CONTAINER}$"; then
    echo "   Utilisation du conteneur Docker '${DB_CONTAINER}'..."
    docker exec "$DB_CONTAINER" pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --no-password \
        --clean \
        --if-exists \
        --schema=public \
        2>/dev/null | gzip > "$DB_DUMP_FILE"
    if [ ! -s "$DB_DUMP_FILE" ]; then
        echo -e "${RED}❌ Le dump de la base de données est vide. Vérifiez que le conteneur '${DB_CONTAINER}' est en cours d'exécution.${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Conteneur PostgreSQL '${DB_CONTAINER}' introuvable.${NC}"
    echo -e "${YELLOW}   Démarrez l'application: docker compose up -d${NC}"
    echo ""
    echo "   Conteneurs en cours d'exécution:"
    docker ps --format '   - {{.Names}}' 2>/dev/null || echo "   (Docker non disponible)"
    exit 1
fi

DB_SIZE=$(du -sh "$DB_DUMP_FILE" | cut -f1)
echo -e "   ${GREEN}✅ Base de données sauvegardée ($DB_SIZE)${NC}"

# ------------------------------------------------
# 2. Sauvegarde des fichiers uploadés
# ------------------------------------------------
echo -e "\n${YELLOW}📎 Sauvegarde des fichiers uploadés...${NC}"

UPLOADS_SOURCE="$PROJECT_DIR/backend/uploads"
UPLOADS_ARCHIVE="$BACKUP_PATH/uploads.tar.gz"

if [ -d "$UPLOADS_SOURCE" ] && [ "$(ls -A "$UPLOADS_SOURCE" 2>/dev/null)" ]; then
    tar -czf "$UPLOADS_ARCHIVE" -C "$PROJECT_DIR/backend" uploads/ 2>/dev/null
    UPLOADS_SIZE=$(du -sh "$UPLOADS_ARCHIVE" | cut -f1)
    echo -e "   ${GREEN}✅ Fichiers sauvegardés ($UPLOADS_SIZE)${NC}"
else
    echo -e "   ${YELLOW}⚠️  Aucun fichier uploadé à sauvegarder${NC}"
fi

# ------------------------------------------------
# 3. Sauvegarde de la configuration
# ------------------------------------------------
echo -e "\n${YELLOW}⚙️  Sauvegarde de la configuration...${NC}"

CONFIG_ARCHIVE="$BACKUP_PATH/config.tar.gz"
tar -czf "$CONFIG_ARCHIVE" \
    -C "$PROJECT_DIR" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='*.log' \
    .env \
    docker-compose.yml \
    nginx/ \
    backend/prisma/schema.prisma \
    2>/dev/null

CONFIG_SIZE=$(du -sh "$CONFIG_ARCHIVE" | cut -f1)
echo -e "   ${GREEN}✅ Configuration sauvegardée ($CONFIG_SIZE)${NC}"

# ------------------------------------------------
# 4. Métadonnées
# ------------------------------------------------
echo -e "\n${YELLOW}📝 Génération des métadonnées...${NC}"

cat > "$BACKUP_PATH/backup_info.json" << EOF
{
  "backup_name": "$BACKUP_NAME",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "database": "$DB_NAME",
  "db_user": "$DB_USER",
  "files": {
    "database": "database.sql.gz",
    "uploads": "uploads.tar.gz",
    "config": "config.tar.gz"
  },
  "created_by": "$(whoami)",
  "hostname": "$(hostname)"
}
EOF

echo -e "   ${GREEN}✅ Métadonnées générées${NC}"

# ------------------------------------------------
# 5. Archivage final
# ------------------------------------------------
echo -e "\n${YELLOW}🗜️  Création de l'archive finale...${NC}"

FINAL_ARCHIVE="$BACKUP_DIR/${BACKUP_NAME}.tar.gz"
tar -czf "$FINAL_ARCHIVE" -C "$BACKUP_DIR" "$BACKUP_NAME/"
rm -rf "$BACKUP_PATH"

FINAL_SIZE=$(du -sh "$FINAL_ARCHIVE" | cut -f1)

# ------------------------------------------------
# 6. Nettoyage des anciennes sauvegardes (garder 30 jours)
# ------------------------------------------------
echo -e "\n${YELLOW}🧹 Nettoyage des sauvegardes > 30 jours...${NC}"

OLD_COUNT=$(find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 2>/dev/null | wc -l)
if [ "$OLD_COUNT" -gt 0 ]; then
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
    echo -e "   ${GREEN}✅ $OLD_COUNT ancienne(s) sauvegarde(s) supprimée(s)${NC}"
else
    echo -e "   ${GREEN}✅ Aucune sauvegarde à supprimer${NC}"
fi

# ------------------------------------------------
# Récapitulatif
# ------------------------------------------------
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    SAUVEGARDE RÉUSSIE ✅                     ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║ Fichier: $(printf '%-52s' "${BACKUP_NAME}.tar.gz") ║${NC}"
echo -e "${GREEN}║ Taille:  $(printf '%-52s' "$FINAL_SIZE") ║${NC}"
echo -e "${GREEN}║ Emplacement: $(printf '%-48s' "$BACKUP_DIR") ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Pour restaurer: ${YELLOW}./scripts/restore.sh $BACKUP_DIR/${BACKUP_NAME}.tar.gz${NC}"
