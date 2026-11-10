#!/usr/bin/env bash
# Dumps the Postgres database running in the "postgres" compose service to
# backups/<timestamp>.sql.gz. Run on a schedule (e.g. cron or a scheduled task)
# for the "backup PostgreSQL hằng ngày" requirement; restore with restore-db.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p backups
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
out="backups/${timestamp}.sql.gz"

docker compose exec -T postgres pg_dump -U timesheet timesheet | gzip > "$out"
echo "Backup written to $out"
