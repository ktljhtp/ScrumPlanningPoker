const Vote = require('./vote');
const { computeMetrics } = require('./voteMetrics.js');

const DEFAULT_DECK = [0, 1, 2, 3, 5, 8, 13, 20, 40, 100, '?', '∞'];

class Room {
  constructor(code, adminSessionId, options = {}) {
    this.code = code;
    this.adminSessionId = adminSessionId;
    this.participants = new Map();
    this.status = 'waiting';
    this.quorum = options.quorum ? Number(options.quorum) : 999;
    this.deck = options.deck || DEFAULT_DECK;
    this.resultMode = options.resultMode || 'median';
    this.currentRound = 0;
    this.createdAt = Date.now();
    this.topic = '';
  }

  join(sessionId, name) {
    this.participants.set(sessionId, { name, hasVoted: false, vote: null });
  }

  removeParticipant(sessionId) {
    const participant = this.participants.get(sessionId);
    if (!participant) return null;
    this.participants.delete(sessionId);
    return participant.name;
  }

  castVote(sessionId, value) {
    if (this.status !== 'active') return { ok: false, reason: 'not_active' };
    const participant = this.participants.get(sessionId);
    if (!participant) return { ok: false, reason: 'not_in_room' };
    if (participant.hasVoted) return { ok: false, reason: 'already_voted' };

    participant.vote = Vote.from(value);
    participant.hasVoted = true;

    const votedCount = [...this.participants.values()].filter(p => p.hasVoted).length;
    const quorumReached = votedCount >= this.quorum;
    return { ok: true, votedCount, quorumReached };
  }

  startRound(quorum) {
    this.status = 'active';
    this.currentRound++;
    if (quorum !== undefined && quorum !== null) {
      this.quorum = Number(quorum);
    }
    for (const p of this.participants.values()) {
      p.hasVoted = false;
      p.vote = null;
    }
  }

  stopRound() {
    this.status = 'stopped';

    const numericValues = [...this.participants.values()]
      .filter(p => p.hasVoted && Vote.isNumber(p.vote))
      .map(p => p.vote.value);

    const metrics = computeMetrics(numericValues);

    const allVotes = [...this.participants.entries()]
      .filter(([, p]) => p.hasVoted)
      .map(([, p]) => ({ name: p.name, vote: Vote.unwrap(p.vote) }));

    const votedCount = [...this.participants.values()].filter(p => p.hasVoted).length;

    // result — значение по текущему resultMode, оставлено для обратной
    // совместимости с фронтом. median/average/distribution — уже готовые
    // метрики, из которых фронт сам выбирает, что показывать.
    const result = this.resultMode === 'average' ? metrics.average : metrics.median;

    return {
      result,
      median: metrics.median,
      average: metrics.average,
      distribution: metrics.distribution,
      allVotes: allVotes.length > 0 ? allVotes : null,
      votedCount,
      resultMode: this.resultMode,
    };
  }
}

module.exports = Room;