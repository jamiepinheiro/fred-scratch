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

async function generateBotClue({ name, role, secretWord }) {
  const persona = BOT_PERSONAS[name] || 'balanced';
  const isImposter = role === 'imposter';

  const prompt = isImposter
    ? `You are ${name}, persona: ${persona}. You are playing an imposter word game.
You DO NOT know the secret word.
Write one short clue (2-6 words) that is vague but plausible.
Return JSON only: {"clue":"..."}`
    : `You are ${name}, persona: ${persona}. You are playing an imposter word game.
Secret word is: ${secretWord}
Write one short clue (2-6 words), not too obvious.
Return JSON only: {"clue":"..."}`;

  const { text } = await generateText({
    model: 'openai/gpt-4o-mini',
    prompt,
    temperature: 0.9
  });

  const parsed = safeJson(text);
  const clue = parsed?.clue?.toString?.().trim?.();
  return clue || (isImposter ? 'Kind of social.' : 'Pretty common one.');
}

async function generateBotVote({ name, role, ownClue, userClue, candidates }) {
  const persona = BOT_PERSONAS[name] || 'balanced';
  const candidateList = candidates.join(', ');

  const prompt = `You are ${name}, persona: ${persona}, role: ${role} in an imposter game.
Important constraint: you only know YOUR clue and the USER clue.
Your clue: "${ownClue}"
User clue: "${userClue || 'No clue provided'}"
Candidates to vote for: ${candidateList}
Pick exactly one candidate name from the list and provide brief reason.
Return JSON only: {"vote":"name","reason":"..."}`;

  const { text } = await generateText({
    model: 'openai/gpt-4o-mini',
    prompt,
    temperature: 0.7
  });

  const parsed = safeJson(text);
  const vote = parsed?.vote?.toString?.().trim?.();
  const reason = parsed?.reason?.toString?.().trim?.();

  const validVote = candidates.includes(vote) ? vote : candidates[Math.floor(Math.random() * candidates.length)];
  return { vote: validVote, reason: reason || 'Going with my gut.' };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body || {};

    if (action === 'generate-bot-clues') {
      const { botRoles, secretWord } = body;
      const entries = await Promise.all(
        Object.entries(botRoles).map(async ([name, role]) => {
          const clue = await generateBotClue({ name, role, secretWord });
          return [name, clue];
        })
      );

      return Response.json({ botClues: Object.fromEntries(entries) });
    }

    if (action === 'generate-bot-votes') {
      const { botRoles, botClues, userClue } = body;
      const names = ['You', ...Object.keys(botRoles)];

      const entries = await Promise.all(
        Object.entries(botRoles).map(async ([name, role]) => {
          const candidates = names.filter((n) => n !== name);
          const { vote, reason } = await generateBotVote({
            name,
            role,
            ownClue: botClues?.[name] || '',
            userClue,
            candidates
          });
          return [name, { vote, reason }];
        })
      );

      return Response.json({ botVotes: Object.fromEntries(entries) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error?.message || 'Game API error' },
      { status: 500 }
    );
  }
}
