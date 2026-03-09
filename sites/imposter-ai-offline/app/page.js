'use client';

import { useMemo, useState } from 'react';
import { pickWordPair } from '../lib/word-packs';

const BOT_NAMES = ['Ava', 'Milo', 'Zara'];

function randomImposterIndex() {
  return Math.floor(Math.random() * 4); // You + 3 bots
}

export default function Page() {
  const [roleMode, setRoleMode] = useState('random');
  const [phase, setPhase] = useState('setup');
  const [secretWord, setSecretWord] = useState('');
  const [imposterName, setImposterName] = useState('');
  const [myRole, setMyRole] = useState('');
  const [botRoles, setBotRoles] = useState({});
  const [userClue, setUserClue] = useState('');
  const [botClues, setBotClues] = useState({});
  const [myVote, setMyVote] = useState('');
  const [botVotes, setBotVotes] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const allPlayers = useMemo(() => ['You', ...BOT_NAMES], []);

  function startGame() {
    const [wordA, wordB] = pickWordPair();
    const chosenWord = Math.random() > 0.5 ? wordA : wordB;

    let impIndex = randomImposterIndex();
    if (roleMode === 'imposter') impIndex = 0;
    if (roleMode === 'non-imposter') {
      impIndex = 1 + Math.floor(Math.random() * 3);
    }

    const impName = allPlayers[impIndex];
    const roles = Object.fromEntries(BOT_NAMES.map((name) => [name, name === impName ? 'imposter' : 'crewmate']));

    setSecretWord(chosenWord);
    setImposterName(impName);
    setMyRole(impName === 'You' ? 'imposter' : 'crewmate');
    setBotRoles(roles);
    setUserClue('');
    setBotClues({});
    setMyVote('');
    setBotVotes({});
    setResult(null);
    setPhase('clues');
  }

  async function generateBotClues() {
    setLoading(true);
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-bot-clues', botRoles, secretWord })
      });
      const data = await res.json();
      setBotClues(data.botClues || {});
      setPhase('voting');
    } finally {
      setLoading(false);
    }
  }

  async function finalizeRound() {
    if (!myVote) return;

    setLoading(true);
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-bot-votes', botRoles, botClues, userClue })
      });
      const data = await res.json();
      const generatedBotVotes = data.botVotes || {};
      setBotVotes(generatedBotVotes);

      const tally = {};
      const allVotes = { You: { vote: myVote, reason: 'My pick.' }, ...generatedBotVotes };
      Object.values(allVotes).forEach((v) => {
        tally[v.vote] = (tally[v.vote] || 0) + 1;
      });

      const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
      const top = sorted[0]?.[0];
      const imposterCaught = top === imposterName;
      const winner = imposterCaught ? 'Crewmates win' : 'Imposter wins';

      setResult({ winner, allVotes, top, imposterName });
      setPhase('result');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Imposter Offline (AI Bots)</h1>
      <p style={{ opacity: 0.82 }}>
        Solo mode with 3 AI characters. Bot clue generation is isolated so bots do not receive each others&apos; clues.
      </p>

      {phase === 'setup' && (
        <section style={card}>
          <h2 style={h2}>New Game</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {[
              ['random', 'Random role'],
              ['imposter', 'Play as imposter'],
              ['non-imposter', 'Play as non-imposter']
            ].map(([value, label]) => (
              <button key={value} onClick={() => setRoleMode(value)} style={pill(roleMode === value)}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={startGame} style={primaryBtn}>Start game</button>
        </section>
      )}

      {phase !== 'setup' && (
        <section style={card}>
          <h2 style={h2}>Your role: {myRole}</h2>
          {myRole === 'crewmate' ? (
            <p>Secret word: <strong>{secretWord}</strong></p>
          ) : (
            <p>You are the imposter — blend in without knowing the secret word.</p>
          )}
          <p style={{ opacity: 0.8 }}>Players: You, {BOT_NAMES.join(', ')}</p>
        </section>
      )}

      {phase === 'clues' && (
        <section style={card}>
          <h2 style={h2}>Round 1: Clues</h2>
          <input
            value={userClue}
            onChange={(e) => setUserClue(e.target.value)}
            placeholder="Your clue (2-6 words)"
            style={input}
          />
          <div style={{ marginTop: 12 }}>
            <button onClick={generateBotClues} disabled={loading || !userClue.trim()} style={primaryBtn}>
              {loading ? 'Generating bot clues…' : 'Lock clue + generate bots'}
            </button>
          </div>
        </section>
      )}

      {(phase === 'voting' || phase === 'result') && (
        <section style={card}>
          <h2 style={h2}>Clues</h2>
          <ul>
            <li><strong>You:</strong> {userClue}</li>
            {BOT_NAMES.map((name) => (
              <li key={name}><strong>{name}:</strong> {botClues[name]}</li>
            ))}
          </ul>
        </section>
      )}

      {phase === 'voting' && (
        <section style={card}>
          <h2 style={h2}>Vote</h2>
          <p>Who is the imposter?</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {allPlayers.filter((p) => p !== 'You').map((name) => (
              <button key={name} onClick={() => setMyVote(name)} style={pill(myVote === name)}>
                {name}
              </button>
            ))}
          </div>
          <button onClick={finalizeRound} disabled={loading || !myVote} style={primaryBtn}>
            {loading ? 'Resolving votes…' : 'Submit vote'}
          </button>
        </section>
      )}

      {phase === 'result' && result && (
        <section style={card}>
          <h2 style={h2}>Result: {result.winner}</h2>
          <p>Most voted: <strong>{result.top}</strong></p>
          <p>Actual imposter: <strong>{result.imposterName}</strong></p>
          <h3 style={{ marginBottom: 8 }}>Votes</h3>
          <ul>
            {Object.entries(result.allVotes).map(([name, v]) => (
              <li key={name}><strong>{name}</strong> → {v.vote} <span style={{ opacity: 0.8 }}>({v.reason})</span></li>
            ))}
          </ul>
          <button onClick={() => setPhase('setup')} style={primaryBtn}>Play again</button>
        </section>
      )}
    </main>
  );
}

const card = {
  border: '1px solid #2a3355',
  background: '#121935',
  borderRadius: 12,
  padding: 16,
  marginBottom: 14
};

const h2 = { marginTop: 0, marginBottom: 10 };

const input = {
  width: '100%',
  padding: 12,
  borderRadius: 10,
  border: '1px solid #2a3355',
  background: '#0f1530',
  color: '#e8ecff'
};

const primaryBtn = {
  padding: '10px 14px',
  borderRadius: 10,
  border: 'none',
  background: '#4f7cff',
  color: 'white',
  fontWeight: 700,
  cursor: 'pointer'
};

const pill = (active) => ({
  padding: '8px 12px',
  borderRadius: 999,
  border: active ? '1px solid #7b9bff' : '1px solid #2a3355',
  background: active ? '#203263' : '#111836',
  color: '#e8ecff',
  cursor: 'pointer'
});
