#!/bin/bash
# dump-project.sh
# Dump tout le code source du projet dans un seul fichier texte,
# avec le chemin de chaque fichier en en-tête. Pratique pour tout
# donner d'un coup à Claude au lieu d'uploader fichier par fichier.
#
# USAGE :
#   chmod +x dump-project.sh
#   ./dump-project.sh
#
# Résultat : project-dump.txt à la racine du projet

OUTPUT="project-dump.txt"
> "$OUTPUT"

# ─── Si le projet est un repo git, on utilise git ls-files ───
# (respecte automatiquement le .gitignore : pas de node_modules,
# pas de .next, pas de .env, etc.)
if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  FILES=$(git ls-files)
else
  # Sinon fallback avec find + exclusions manuelles
  FILES=$(find . \
    -type f \
    \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
       -o -name "*.json" -o -name "*.css" -o -name "*.md" -o -name "*.mjs" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.next/*" \
    -not -path "*/.git/*" \
    -not -path "*/dist/*" \
    -not -path "*/build/*" \
    -not -name "package-lock.json" \
    -not -name "*.tsbuildinfo")
fi

COUNT=0

for f in $FILES; do
  # ─── Sécurité anti-fuite : on exclut tout ce qui ressemble à des secrets ───
  case "$f" in
    *.env*|*secret*|*credentials*|*.pem|*.key) continue ;;
  esac

  # Skip fichiers trop gros (>200KB) — probablement générés/lock files
  SIZE=$(wc -c < "$f" 2>/dev/null || echo 0)
  if [ "$SIZE" -gt 200000 ]; then continue; fi

  echo "═══════════════════════════════════════════════════════" >> "$OUTPUT"
  echo "FILE: $f" >> "$OUTPUT"
  echo "═══════════════════════════════════════════════════════" >> "$OUTPUT"
  cat "$f" >> "$OUTPUT"
  echo -e "\n\n" >> "$OUTPUT"
  COUNT=$((COUNT+1))
done

echo "✅ $COUNT fichiers exportés dans $OUTPUT"
echo "   Taille : $(du -h "$OUTPUT" | cut -f1)"