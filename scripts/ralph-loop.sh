#!/bin/bash
# Ralph Wiggum Loop — autonomous iterative development
# Usage:
#   ./scripts/ralph-loop.sh "refactor all step components under 400 lines"
#   ./scripts/ralph-loop.sh "fix all lint warnings" 10
#   ./scripts/ralph-loop.sh plan "plan the new habitat mapping feature"
#
# Arguments:
#   $1 = "plan" for plan mode, or the build prompt
#   $2 = prompt (if plan mode) or max iterations
#   $3 = max iterations (if plan mode)

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Parse arguments
if [ "$1" = "plan" ]; then
  MODE="plan"
  PROMPT="$2"
  MAX_ITERATIONS=${3:-5}
else
  MODE="build"
  PROMPT="$1"
  MAX_ITERATIONS=${2:-10}
fi

if [ -z "$PROMPT" ]; then
  echo -e "${RED}Usage: ./scripts/ralph-loop.sh [plan] \"<prompt>\" [max-iterations]${NC}"
  echo ""
  echo "Examples:"
  echo "  ./scripts/ralph-loop.sh \"fix all lint warnings in components/steps/\""
  echo "  ./scripts/ralph-loop.sh \"refactor step components under 400 lines\" 15"
  echo "  ./scripts/ralph-loop.sh plan \"plan the aquatic feature improvements\""
  exit 1
fi

ITERATION=0
BRANCH=$(git branch --show-current)
PROJECT_DIR=$(pwd)
PLAN_FILE="$PROJECT_DIR/IMPLEMENTATION_PLAN.md"

echo -e "${GREEN}Ralph Wiggum Loop${NC}"
echo -e "Mode: ${YELLOW}$MODE${NC}"
echo -e "Prompt: ${YELLOW}$PROMPT${NC}"
echo -e "Max iterations: ${YELLOW}$MAX_ITERATIONS${NC}"
echo -e "Branch: ${YELLOW}$BRANCH${NC}"
echo ""

# Build the full prompt with context
build_prompt() {
  local iter=$1
  cat <<PROMPT_EOF
You are in iteration $iter of a Ralph Wiggum autonomous loop ($MODE mode).

## Task
$PROMPT

## Rules
- Study the codebase before making changes — use subagents for parallel reads
- Don't assume something is missing — search first
- One task per iteration, commit when tests/lint pass
- Run \`npm run lint\` and \`npm run type-check\` after changes
- If both pass, commit with a descriptive message
- If they fail, fix the issues before committing
$([ "$MODE" = "plan" ] && echo "- PLAN ONLY — do NOT implement. Write findings to IMPLEMENTATION_PLAN.md" || echo "- If IMPLEMENTATION_PLAN.md exists, read it and work on the highest priority item")
$([ "$MODE" = "build" ] && echo "- After committing, update IMPLEMENTATION_PLAN.md to mark the item as done")

## Completion
- If the task is fully complete (nothing left to do), create a file called .ralph-done
- If you made progress but more work remains, just commit and exit normally
PROMPT_EOF
}

# Main loop
while true; do
  if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ]; then
    echo -e "${YELLOW}Reached max iterations: $MAX_ITERATIONS${NC}"
    break
  fi

  ITERATION=$((ITERATION + 1))
  echo -e "${GREEN}━━━ Iteration $ITERATION / $MAX_ITERATIONS ━━━${NC}"

  # Check if previous iteration marked completion
  if [ -f .ralph-done ]; then
    rm -f .ralph-done
    echo -e "${GREEN}Task complete! Ralph is done.${NC}"
    break
  fi

  # Run Claude with the prompt
  build_prompt $ITERATION | claude -p \
    --model opus \
    --output-format stream-json \
    --verbose 2>&1 | while IFS= read -r line; do
      # Show assistant messages
      TYPE=$(echo "$line" | jq -r '.type // empty' 2>/dev/null)
      if [ "$TYPE" = "assistant" ]; then
        MSG=$(echo "$line" | jq -r '.message.content[0].text // empty' 2>/dev/null)
        if [ -n "$MSG" ]; then
          echo "$MSG"
        fi
      fi
    done

  # Push after each iteration
  git push origin "$BRANCH" 2>/dev/null || true

  echo -e "${YELLOW}━━━ Iteration $ITERATION complete ━━━${NC}"
  echo ""
done

# Cleanup
rm -f .ralph-done

echo -e "${GREEN}Ralph Wiggum loop finished after $ITERATION iterations.${NC}"
