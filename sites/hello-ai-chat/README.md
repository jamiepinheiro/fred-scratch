# hello-ai-chat

A simple Hello World AI chat app using Next.js + Vercel AI SDK, routed through **Vercel AI Gateway**.

## Run locally

```bash
npm install
npm run dev
```

Set `AI_GATEWAY_API_KEY` in `.env.local`.

## Deploy

```bash
vercel
```

On Vercel, AI Gateway can also authenticate via OIDC (no API key needed) if enabled for the project/team.
