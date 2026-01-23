#!/bin/bash
# Blocks modifications to sensitive files that should not be edited by AI
# Exit code 2 = block operation (message shown to Claude via stderr)
# Exit code 0 = allow operation

set -euo pipefail

# Read file path from stdin JSON
FILE_PATH=$(jq -r '.tool_input.file_path // ""' 2>/dev/null || echo "")

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Protected file patterns (exact matches and patterns)
declare -a PROTECTED_EXACT=(
  '.env'
  '.env.local'
  '.env.development'
  '.env.production'
  '.env.test'
  'package-lock.json'
  'pnpm-lock.yaml'
  'yarn.lock'
)

declare -a PROTECTED_PATTERNS=(
  # Git internals
  '\.git/'

  # Dependencies
  'node_modules/'

  # Secrets and credentials
  'secrets/'
  'credentials'
  '\.pem$'
  '\.key$'
  'id_rsa'
  'id_ed25519'

  # Binary files
  '\.png$'
  '\.jpg$'
  '\.jpeg$'
  '\.gif$'
  '\.ico$'
  '\.webp$'
  '\.mp4$'
  '\.mp3$'
  '\.pdf$'
  '\.woff2?$'
  '\.ttf$'
  '\.eot$'

  # Build artifacts
  'dist/'
  'build/'
  '\.next/'

  # Local settings (let users manage their own)
  'settings\.local\.json$'
)

# Check exact matches
for protected in "${PROTECTED_EXACT[@]}"; do
  # Check if file path ends with or equals the protected file
  if [[ "$FILE_PATH" == *"/$protected" ]] || [[ "$FILE_PATH" == "$protected" ]]; then
    echo "BLOCKED: Cannot modify protected file '$FILE_PATH'" >&2
    echo "" >&2
    echo "This file is protected because it contains sensitive configuration." >&2
    echo "Please ask the user to modify this file manually if needed." >&2
    exit 2
  fi
done

# Check pattern matches
for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if echo "$FILE_PATH" | grep -qE "$pattern"; then
    echo "BLOCKED: Cannot modify file matching protected pattern '$pattern'" >&2
    echo "File: $FILE_PATH" >&2
    echo "" >&2
    echo "Please ask the user to modify this file manually if needed." >&2
    exit 2
  fi
done

exit 0
