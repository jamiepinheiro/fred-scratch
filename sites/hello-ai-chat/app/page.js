'use client';

import { useChat } from 'ai/react';

export default function Page() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Hello AI Chat</h1>
      <p style={{ opacity: 0.8 }}>Simple starter using Next.js + Vercel AI SDK.</p>

      <div style={{ border: '1px solid #2a3355', borderRadius: 12, padding: 16, minHeight: 320, marginBottom: 16, background: '#121935' }}>
        {messages.length === 0 && <p style={{ opacity: 0.7 }}>Ask anything to get started.</p>}
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 12 }}>
            <strong style={{ textTransform: 'capitalize' }}>{m.role}:</strong>{' '}
            <span>{m.content}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #2a3355', background: '#0f1530', color: '#e8ecff' }}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{ padding: '12px 16px', borderRadius: 10, border: 'none', background: '#4f7cff', color: 'white', fontWeight: 600 }}
        >
          {isLoading ? 'Sending…' : 'Send'}
        </button>
      </form>
    </main>
  );
}
