#!/usr/bin/env bash
# Restores a backup produced by backup-db.sh into the "postgres" compose service.
# Usage: scripts/restore-db.sh backups/20260101T000000Z.sql.gz
# Always test a restore against a throwaway database before trusting a backup.
set -euo pipefail
cd "$(dirname "$0")/.."

file="${1:?Usage: restore-db.sh <path-to-backup.sql.gz>}"
gunzip -c "$file" | docker compose exec -T postgres psql -U timesheet timesheet
echo "Restored $file"
