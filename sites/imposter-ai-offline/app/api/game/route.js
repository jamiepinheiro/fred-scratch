import { generateText } from 'ai';

export const runtime = 'edge';

const BOT_PERSONAS = {
  Ava: 'calm, analytical, concise',
  Milo: 'friendly, playful, casual',
  Zara: 'confident, witty, sharp'
};

function safeJson(text) {
  try {
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '');
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function forceSingleWord(value, fallback = 'hmm') {
  const raw = (value || '').toString().trim();
  if (!raw) return fallback;
  const normalized = raw.replace(/[\n\r\t]/g, ' ').replace(/[^A-Za-z0-9'\- ]/g, '');
  const token = normalized.split(/\s+/)[0]?.trim();
  return token || fallback;
}

async function generateBotWord({ name, role, secretWord, publicTurns }) {
  const persona = BOT_PERSONAS[name] || 'balanced';
  const isImposter = role === 'imposter';

  const prompt = `You are ${name}, persona: ${persona}. You are in a social deduction word game.

PUBLIC GAME STATE (everyone sees this):
${JSON.stringify(publicTurns, null, 2)}

PRIVATE STATE (only you know this):
- role: ${role}
- secret_word: ${isImposter ? '(unknown to you)' : secretWord}

Rules:
- Say EXACTLY one single word for your turn.
- Do not explain.
- If imposter, bluff with a plausible related word.
- Avoid repeating any exact word already used in public state.

Return JSON only: {"word":"one_word"}`;

  const { text } = await generateText({
    model: 'openai/gpt-4o-mini',
    prompt,
    temperature: 0.9
  });

  const parsed = safeJson(text);
  const candidate = forceSingleWord(parsed?.word, isImposter ? 'maybe' : 'nature');

  const used = new Set((publicTurns || []).map((t) => (t.word || '').toLowerCase()));
  if (used.has(candidate.toLowerCase())) {
    return isImposter ? 'guess' : 'clue';
  }

  return candidate;
}

async function generateBotVote({ name, role, secretWord, publicTurns, candidates }) {
  const persona = BOT_PERSONAS[name] || 'balanced';

  const prompt = `You are ${name}, persona: ${persona}. You are voting in a social deduction word game.

PUBLIC GAME STATE (everyone sees this):
${JSON.stringify(publicTurns, null, 2)}

PRIVATE STATE (only you know this):
- role: ${role}
- secret_word: ${role === 'imposter' ? '(unknown to you)' : secretWord}

Candidates: ${candidates.join(', ')}
Choose exactly one candidate and include a short reason.
Return JSON only: {"vote":"name","reason":"..."}`;

  const { text } = await generateText({
    model: 'openai/gpt-4o-mini',
    prompt,
    temperature: 0.7
  });

  const parsed = safeJson(text);
  const vote = parsed?.vote?.toString?.().trim?.();
  const reason = parsed?.reason?.toString?.().trim?.();

  const validVote = candidates.includes(vote)
    ? vote
    : candidates[Math.floor(Math.random() * candidates.length)];

  return { vote: validVote, reason: reason || 'Suspicious wording.' };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body || {};

    if (action === 'bot-turn') {
      const { botName, role, secretWord, publicTurns } = body;
      if (!botName || !role) {
        return Response.json({ error: 'Missing botName/role' }, { status: 400 });
      }

      const word = await generateBotWord({
        name: botName,
        role,
        secretWord,
        publicTurns: publicTurns || []
      });

      return Response.json({ word });
    }

    if (action === 'generate-bot-votes') {
      const { botRoles, secretWord, publicTurns } = body;
      const names = ['You', ...Object.keys(botRoles || {})];

      const entries = await Promise.all(
        Object.entries(botRoles || {}).map(async ([name, role]) => {
          const candidates = names.filter((n) => n !== name);
          const { vote, reason } = await generateBotVote({
            name,
            role,
            secretWord,
            publicTurns: publicTurns || [],
            candidates
          });
          return [name, { vote, reason }];
        })
      );

      return Response.json({ botVotes: Object.fromEntries(entries) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error?.message || 'Game API error' }, { status: 500 });
  }
}
