# imposter-ai-offline

Solo imposter game with 3 AI bot players.

## Features

- Play alone against 3 LLM characters (Ava, Milo, Zara)
- Choose your role: imposter / non-imposter / random
- Bot clue generation is isolated per bot (no bot gets other bots' clues)
- Vercel AI Gateway model routing via `openai/gpt-4o-mini`

## Run

```bash
npm install
npm run dev
```

## Env

Optional local env:

- `AI_GATEWAY_API_KEY`
