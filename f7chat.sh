#!/usr/bin/env bash
if [ -z "$OPENROUTER_API_KEY" ]; then
  echo "Error: OPENROUTER_API_KEY is not set."
  exit 1
fi

PROMPT="$*"
if [ -z "$PROMPT" ]; then
  echo "Usage: ./f7chat.sh <your prompt>"
  exit 1
fi

curl -s https://openrouter.ai/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -d "{
    \"model\": \"openrouter/free\",
    \"messages\": [
      {\"role\": \"system\", \"content\": \"You are a helpful assistant.\"},
      {\"role\": \"user\", \"content\": $(echo "$PROMPT" | jq -Rs .)}
    ]
  }" | jq -r '.choices[0].message.content'
