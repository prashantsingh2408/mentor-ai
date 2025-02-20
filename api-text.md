curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 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" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'