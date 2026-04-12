#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-full}"
REPORT_DIR=".reports"
REPORT_PATH="$REPORT_DIR/developer-scorecard.json"

mkdir -p "$REPORT_DIR"

ENTRIES=()
TOTAL=0
MAX=0

run_check() {
  local name="$1"
  local weight="$2"
  local command="$3"
  MAX=$((MAX + weight))

  if eval "$command"; then
    TOTAL=$((TOTAL + weight))
    ENTRIES+=("{\"name\":\"$name\",\"passed\":true,\"score\":$weight,\"maxScore\":$weight,\"details\":\"$command\"}")
  else
    ENTRIES+=("{\"name\":\"$name\",\"passed\":false,\"score\":0,\"maxScore\":$weight,\"details\":\"$command\"}")
    return 1
  fi
}

run_optional_check() {
  local name="$1"
  local weight="$2"
  local command="$3"
  MAX=$((MAX + weight))

  if eval "$command"; then
    TOTAL=$((TOTAL + weight))
    ENTRIES+=("{\"name\":\"$name\",\"passed\":true,\"score\":$weight,\"maxScore\":$weight,\"details\":\"$command\"}")
  else
    ENTRIES+=("{\"name\":\"$name\",\"passed\":false,\"score\":0,\"maxScore\":$weight,\"details\":\"$command\"}")
  fi
}

run_check "lint" 20 "pnpm lint"
run_check "typescript" 20 "pnpm typecheck"
run_check "tests" 20 "pnpm test"
run_check "dashboard-build" 25 "pnpm --filter observatory-web build"

if [[ "$MODE" != "quick" ]]; then
  run_optional_check "workspace-build" 15 "pnpm build"
fi

GRADE="F"
if (( TOTAL >= 90 )); then
  GRADE="A"
elif (( TOTAL >= 70 )); then
  GRADE="B"
elif (( TOTAL >= 50 )); then
  GRADE="C"
fi

{
  printf '{\n'
  printf '  "mode": "developer",\n'
  printf '  "variant": "%s",\n' "$MODE"
  printf '  "totalScore": %s,\n' "$TOTAL"
  printf '  "maxScore": %s,\n' "$MAX"
  printf '  "grade": "%s",\n' "$GRADE"
  printf '  "generatedAt": "%s",\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  printf '  "entries": [\n'
  for i in "${!ENTRIES[@]}"; do
    if [[ "$i" -gt 0 ]]; then
      printf ',\n'
    fi
    printf '    %s' "${ENTRIES[$i]}"
  done
  printf '\n  ]\n'
  printf '}\n'
} > "$REPORT_PATH"

cat "$REPORT_PATH"
