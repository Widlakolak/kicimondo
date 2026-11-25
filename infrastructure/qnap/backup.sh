#!/bin/sh
set -eu
umask 077

here=$(CDPATH='' cd "$(dirname "$0")" && pwd)
destination=${1:-"$here/backups"}
environment=${2:-"$here/.env.production"}
project=${3:-kicimondo}
mkdir -p "$destination"
backup="$destination/$(date -u '+%Y%m%dT%H%M%SZ')-$$"
mkdir "$backup"
: > "$backup/incomplete"

compose() {
    docker compose -p "$project" --env-file "$environment" -f "$here/compose.yaml" --profile content "$@"
}

compose exec -T kicimondo-postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup/content.dump"
compose exec -T kicimondo-postgres pg_restore --list < "$backup/content.dump" > "$backup/archive-list.txt"
{
    printf 'Project: %s\nUTC: %s\n' "$project" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    for service in kicimondo-frontend kicimondo-backend kicimondo-postgres; do
        container=$(compose ps -q "$service")
        [ -n "$container" ] || { printf '%s stopped\n' "$service"; continue; }
        printf '%s ' "$service"
        docker inspect --format '{{.Config.Image}} {{.Image}}' "$container"
    done
    compose exec -T kicimondo-postgres sh -c 'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT version, checksum FROM flyway_schema_history WHERE success ORDER BY installed_rank"'
} > "$backup/release.txt"
rm "$backup/incomplete"
printf '%s\n' "$backup"
