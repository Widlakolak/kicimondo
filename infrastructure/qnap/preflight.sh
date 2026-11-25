#!/bin/sh
set -eu

printf '\nHost and CPU\n'
uname -m
awk '/^(model name|flags)[[:space:]]*:/ && !seen[$1]++ { print }' /proc/cpuinfo
uptime
printf '\nMemory and disk\n'
awk '/^Mem(Total|Available):|^Swap(Total|Free):/' /proc/meminfo
df -Pk "${1:-/share/CACHEDEV1_DATA/Container}"
printf '\nDocker and Compose\n'
docker version --format 'Docker {{.Server.Version}} ({{.Server.Arch}})'
docker info --format 'Cgroup driver: {{.CgroupDriver}}'
docker compose version
docker compose ls
printf '\nContainers and published ports\n'
docker ps --format '{{.Names}}\t{{.Status}}\t{{.Ports}}'
docker stats --no-stream --format '{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'
printf '\nNetworks\n'
docker network ls --format '{{.Name}}\t{{.Driver}}'
if command -v netstat >/dev/null 2>&1; then
    printf '\nListening TCP ports\n'
    netstat -lnt
fi
