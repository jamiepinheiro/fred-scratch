import { convertToModelMessages, streamText } from 'ai';

export const runtime = 'edge';

export async function POST(req) {
  const { messages } = await req.json();

  const result = streamText({
    // Using creator/model format routes requests through Vercel AI Gateway.
    model: 'openai/gpt-4o-mini',
    messages: convertToModelMessages(messages)
  });

  return result.toUIMessageStreamResponse();
}
