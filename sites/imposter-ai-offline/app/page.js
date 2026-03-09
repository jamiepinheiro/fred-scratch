'use client';

import { useMemo, useState } from 'react';
import { pickWordPair } from '../lib/word-packs';

const BOT_NAMES = ['Ava', 'Milo', 'Zara'];

function randomImposterIndex() {
  return Math.floor(Math.random() * 4); // You + 3 bots
}

function oneWord(input) {
  const cleaned = (input || '').trim().replace(/[^A-Za-z0-9'\-\s]/g, '');
  return cleaned.split(/\s+/)[0] || '';
}

export default function Page() {
  const [roleMode, setRoleMode] = useState('random');
  const [phase, setPhase] = useState('setup');

  const [secretWord, setSecretWord] = useState('');
  const [imposterName, setImposterName] = useState('');
  const [myRole, setMyRole] = useState('');
  const [botRoles, setBotRoles] = useState({});

  const [turnOrder, setTurnOrder] = useState([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [turns, setTurns] = useState([]);
  const [myWord, setMyWord] = useState('');

  const [myVote, setMyVote] = useState('');
  const [botVotes, setBotVotes] = useState({});
  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allPlayers = useMemo(() => ['You', ...BOT_NAMES], []);

  function startGame() {
    const [wordA, wordB] = pickWordPair();
    const chosenWord = Math.random() > 0.5 ? wordA : wordB;

    let impIndex = randomImposterIndex();
    if (roleMode === 'imposter') impIndex = 0;
    if (roleMode === 'non-imposter') impIndex = 1 + Math.floor(Math.random() * 3);

    const impName = allPlayers[impIndex];
    const roles = Object.fromEntries(
      BOT_NAMES.map((name) => [name, name === impName ? 'imposter' : 'crewmate'])
    );

    const startIndex = Math.floor(Math.random() * allPlayers.length);
    const order = Array.from({ length: allPlayers.length }, (_, i) => allPlayers[(startIndex + i) % allPlayers.length]);

    setSecretWord(chosenWord);
    setImposterName(impName);
    setMyRole(impName === 'You' ? 'imposter' : 'crewmate');
    setBotRoles(roles);

    setTurnOrder(order);
    setTurnIndex(0);
    setTurns([]);
    setMyWord('');

    setMyVote('');
    setBotVotes({});
    setResult(null);

    setError('');
    setPhase('turns');
  }

  const currentPlayer = phase === 'turns' ? turnOrder[turnIndex] : null;

  async function submitMyWord() {
    const word = oneWord(myWord);
    if (!word) return;

    const nextTurns = [...turns, { player: 'You', word }];
    setTurns(nextTurns);
    setMyWord('');

    if (nextTurns.length >= 4) {
      setPhase('voting');
      return;
    }

    setTurnIndex((x) => x + 1);
  }

  async function runBotTurn() {
    if (!currentPlayer || currentPlayer === 'You') return;

    setLoading(true);
    setError('');
    try {
      const role = botRoles[currentPlayer];
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bot-turn',
          botName: currentPlayer,
          role,
          secretWord,
          publicTurns: turns
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Bot turn failed');

      const word = oneWord(data?.word || 'hmm');
      const nextTurns = [...turns, { player: currentPlayer, word }];
      setTurns(nextTurns);

      if (nextTurns.length >= 4) {
        setPhase('voting');
      } else {
        setTurnIndex((x) => x + 1);
      }
    } catch (e) {
      setError(e.message || 'Bot turn failed');
    } finally {
      setLoading(false);
    }
  }

  async function finalizeRound() {
    if (!myVote) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-bot-votes',
          botRoles,
          secretWord,
          publicTurns: turns
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to generate bot votes');
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
    } catch (e) {
      setError(e.message || 'Failed to generate bot votes');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Imposter Offline (AI Bots)</h1>
      <p style={{ opacity: 0.82 }}>
        Turn-based one-word mode. Bots get full public state (all spoken words + who said them) and their own private role/word.
      </p>
      {error && (
        <div style={{ ...card, borderColor: '#8b2b2b', background: '#2a1414' }}>
          <strong>Game error:</strong> {error}
        </div>
      )}

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
            <p>You are the imposter — you do not know the secret word.</p>
          )}
          <p style={{ opacity: 0.8 }}>Turn order: {turnOrder.join(' → ')}</p>
        </section>
      )}

      {phase === 'turns' && (
        <section style={card}>
          <h2 style={h2}>Word turns ({turns.length}/4)</h2>
          <p>Current player: <strong>{currentPlayer}</strong></p>

          {currentPlayer === 'You' ? (
            <>
              <input
                value={myWord}
                onChange={(e) => setMyWord(e.target.value)}
                placeholder="Your one word"
                style={input}
              />
              <div style={{ marginTop: 12 }}>
                <button onClick={submitMyWord} disabled={loading || !oneWord(myWord)} style={primaryBtn}>
                  Submit word
                </button>
              </div>
            </>
          ) : (
            <button onClick={runBotTurn} disabled={loading} style={primaryBtn}>
              {loading ? `${currentPlayer} is thinking…` : `Run ${currentPlayer}'s turn`}
            </button>
          )}

          {turns.length > 0 && (
            <ul style={{ marginTop: 12 }}>
              {turns.map((t, i) => (
                <li key={`${t.player}-${i}`}><strong>{t.player}:</strong> {t.word}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {(phase === 'voting' || phase === 'result') && (
        <section style={card}>
          <h2 style={h2}>Public words</h2>
          <ul>
            {turns.map((t, i) => (
              <li key={`${t.player}-${i}`}><strong>{t.player}:</strong> {t.word}</li>
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
          {myRole === 'crewmate' && <p>Secret word was: <strong>{secretWord}</strong></p>}
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
