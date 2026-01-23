#!/bin/bash
# Logs all tool uses for audit trail
# This hook never blocks - it only logs

set -euo pipefail

# Derive log directory from script location (script is in .claude/hooks/, logs are in .claude/logs/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/../logs"
LOG_FILE="$LOG_DIR/audit.jsonl"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Read the full input and add timestamp
INPUT=$(cat)

# Create audit entry with timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null || echo "unknown")

# Log entry (compact JSON, one line per entry)
echo "$INPUT" | jq -c --arg ts "$TIMESTAMP" '{timestamp: $ts, tool: .tool_name, input: .tool_input}' >> "$LOG_FILE" 2>/dev/null || true

# Always allow - this is just logging
exit 0
