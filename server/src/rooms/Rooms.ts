import * as VoteModule from './vote';
import { computeMetrics } from './voteMetrics.js';
import { RoomStatus } from '../types/constants';
import { Result, ok, err, ErrorCode } from '../types/errors';

type CardValue = VoteModule.CardValue;
type ResultMode = 'median' | 'average';

interface Participant {
  name: string;
  hasVoted: boolean;
  vote: VoteModule.Vote | null;
}

interface RoomOptions {
  quorum?: number | string;
  deck?: CardValue[];
  resultMode?: ResultMode;
}

interface CastVoteData {
  votedCount: number;
  quorumReached: boolean;
}

interface StopRoundResult {
  result: number | null;
  median: number | null;
  average: number | null;
  distribution: { value: number; count: number }[];
  allVotes: { name: string; vote: CardValue | null }[] | null;
  votedCount: number;
  resultMode: ResultMode;
}

const DEFAULT_DECK: CardValue[] = [0, 1, 2, 3, 5, 8, 13, 20, 40, 100, '?', '∞'];

class Room {
  code: string;
  adminSessionId: string;
  participants: Map<string, Participant>;
  status: RoomStatus;
  quorum: number;
  deck: CardValue[];
  resultMode: ResultMode;
  currentRound: number;
  createdAt: number;
  topic: string;

  constructor(code: string, adminSessionId: string, options: RoomOptions = {}) {
    this.code = code;
    this.adminSessionId = adminSessionId;
    this.participants = new Map();
    this.status = RoomStatus.WAITING;
    this.quorum = options.quorum ? Number(options.quorum) : 999;
    this.deck = options.deck || DEFAULT_DECK;
    this.resultMode = options.resultMode || 'median';
    this.currentRound = 0;
    this.createdAt = Date.now();
    this.topic = '';
  }

  join(sessionId: string, name: string): void {
    this.participants.set(sessionId, { name, hasVoted: false, vote: null });
  }

  removeParticipant(sessionId: string): string | null {
    const participant = this.participants.get(sessionId);
    if (!participant) return null;
    this.participants.delete(sessionId);
    return participant.name;
  }

  /**
   * Раньше возвращала { ok: false, reason: 'not_active' | 'not_in_room' | 'already_voted' }.
   * Теперь — Result<CastVoteData> с ErrorCode вместо строк reason.
   * roomController.js (следующий этап трогать не будет) сам переводит
   * Result обратно в старый { ok, reason } для socketHandler — см. комментарий там.
   */
  castVote(sessionId: string, value: CardValue): Result<CastVoteData> {
    if (this.status !== RoomStatus.ACTIVE) {
      return err(ErrorCode.ROUND_NOT_ACTIVE, 'Раунд ещё не запущен');
    }
    const participant = this.participants.get(sessionId);
    if (!participant) {
      return err(ErrorCode.NOT_IN_ROOM, 'Пользователь не находится в комнате');
    }
    if (participant.hasVoted) {
      return err(ErrorCode.ALREADY_VOTED, 'Голос в этом раунде уже принят');
    }

    participant.vote = VoteModule.from(value);
    participant.hasVoted = true;

    const votedCount = [...this.participants.values()].filter((p) => p.hasVoted).length;
    const quorumReached = votedCount >= this.quorum;
    return ok({ votedCount, quorumReached });
  }

  startRound(quorum?: number | string): void {
    this.status = RoomStatus.ACTIVE;
    this.currentRound++;
    if (quorum !== undefined && quorum !== null) {
      this.quorum = Number(quorum);
    }
    for (const p of this.participants.values()) {
      p.hasVoted = false;
      p.vote = null;
    }
  }

  stopRound(): StopRoundResult {
    this.status = RoomStatus.STOPPED;

    const numericValues = [...this.participants.values()]
      .filter((p): p is Participant & { vote: VoteModule.NumberVote } => p.hasVoted && VoteModule.isNumber(p.vote))
      .map((p) => p.vote.value);

    const metrics = computeMetrics(numericValues);

    const allVotes = [...this.participants.entries()]
      .filter(([, p]) => p.hasVoted)
      .map(([, p]) => ({ name: p.name, vote: VoteModule.unwrap(p.vote) }));

    const votedCount = [...this.participants.values()].filter((p) => p.hasVoted).length;

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

  /** Раньше это была прямая запись `room.status = 'waiting'` в roomController. */
  newRound(): void {
    this.status = RoomStatus.WAITING;
  }
}

export = Room;