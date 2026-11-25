#!/bin/sh
set -eu

archive=/var/lib/kicimondo/assets
mkdir -p "$archive"
for file in /usr/share/nginx/html/assets/*; do
    [ -f "$file" ] || continue
    target="$archive/${file##*/}"
    if [ -f "$target" ]; then
        if ! cmp -s "$file" "$target"; then
            printf 'Different bytes for fingerprinted asset %s\n' "${file##*/}" >&2
            exit 1
        fi
        continue
    fi
    staged=$(mktemp "$archive/.asset.XXXXXX")
    trap 'rm -f "$staged"' EXIT HUP INT TERM
    cat "$file" > "$staged"
    mv "$staged" "$target"
    trap - EXIT HUP INT TERM
done
exec "$@"
