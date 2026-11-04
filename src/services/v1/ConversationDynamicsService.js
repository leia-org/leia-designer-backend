import { v4 } from 'uuid';
import RunnerTestSession from '../../models/RunnerTestSession.js';
import RunnerService from './RunnerService.js';
import { buildOpeningPrompt } from '../../utils/openingPrompt.js';
import logger from '../../utils/logger.js';

const dynamics = (session) => session.leia?.spec?.behaviour?.spec?.conversationDynamics || {};
export function publicDynamicsState(session) {
  const config = dynamics(session);
  return {
    canFinish: config.stoppingCondition?.enabled !== true || session.stoppingSatisfied === true,
    leiaSpeaksFirst: { enabled: config.leiaSpeaksFirst?.enabled === true, completed: session.openingCompleted === true },
    stoppingCondition: { enabled: config.stoppingCondition?.enabled === true, satisfied: session.stoppingSatisfied === true },
  };
}

class ConversationDynamicsService {
  observations = new Map();

  async create(sessionId, user, leia, runnerConfiguration) {
    await RunnerTestSession.create({ _id: sessionId, user: String(user), leia, runnerConfiguration });
  }

  async find(sessionId, user) {
    const session = await RunnerTestSession.findOne({ _id: sessionId, user: String(user) });
    if (!session) {
      const error = new Error('Test session not found. Start a new test.');
      error.statusCode = 404;
      throw error;
    }
    return session;
  }

  async open(session) {
    const first = dynamics(session).leiaSpeaksFirst;
    if (first?.enabled !== true || session.messages.length || session.openingCompleted) return;
    const claim = await RunnerTestSession.findOneAndUpdate({ _id: session.id,
      openingCompleted: false, 'messages.0': { $exists: false },
      $or: [{ openingClaimedAt: { $exists: false } }, { openingClaimedAt: { $lt: new Date(Date.now() - 120000) } }],
    }, { $set: { openingClaimedAt: new Date() } }, { new: true });
    if (!claim) return;
    try {
      const response = await RunnerService.sendMessage(session.id, buildOpeningPrompt(first.config.firstMessage), { opening: true });
      const text = typeof response === 'string' ? response : response?.message;
      if (!text) throw new Error('LEIA did not return an opening message');
      await RunnerTestSession.updateOne({ _id: session.id, openingCompleted: false }, {
        $push: { messages: this.message(text, true) }, $set: { openingCompleted: true },
        $unset: { openingClaimedAt: 1 },
      });
    } catch (error) {
      await RunnerTestSession.updateOne({ _id: session.id }, { $unset: { openingClaimedAt: 1 } });
      throw error;
    }
  }

  message(text, isLeia) {
    return { id: v4(), text, isLeia, timestamp: new Date() };
  }

  async record(sessionId, text, isLeia) {
    if (typeof text !== 'string' || !text.trim()) return;
    await RunnerTestSession.updateOne({ _id: sessionId }, { $push: { messages: this.message(text, isLeia) } });
  }

  async observe(sessionId) {
    if (this.observations.has(sessionId)) return this.observations.get(sessionId);
    const work = (async () => {
      const session = await RunnerTestSession.findById(sessionId);
      const stopping = dynamics(session).stoppingCondition;
      const latest = session.messages.at(-1);
      if (stopping?.enabled !== true || session.stoppingSatisfied || !latest?.isLeia ||
          !session.messages.some((entry) => !entry.isLeia) || session.lastObservedMessageId === latest.id) return;
      const decision = await RunnerService.evaluateStoppingCondition(stopping.config.condition,
        session.messages.map((entry) => ({ role: entry.isLeia ? 'leia' : 'student', text: entry.text })),
        session.leia?.spec?.behaviour?.spec?.description, session.runnerConfiguration);
      await RunnerTestSession.updateOne({ _id: sessionId, stoppingSatisfied: { $ne: true } }, {
        $set: { stoppingSatisfied: decision.satisfied === true, lastObservedMessageId: latest.id },
      });
    })().catch((error) => logger.error(`Stopping condition evaluation failed for ${sessionId}: ${error.message}`))
      .finally(() => this.observations.delete(sessionId));
    this.observations.set(sessionId, work);
    return work;
  }

  async getState(sessionId, user) {
    const session = await this.find(sessionId, user);
    await this.open(session);
    await this.observe(sessionId);
    const updated = await this.find(sessionId, user);
    return { messages: updated.messages, conversationDynamics: publicDynamicsState(updated) };
  }

  async assertCanFinish(sessionId, user) {
    await this.find(sessionId, user);
    await this.observe(sessionId);
    if (!publicDynamicsState(await this.find(sessionId, user)).canFinish) {
      const error = new Error('LEIA has not yet decided to end the conversation');
      error.statusCode = 403;
      throw error;
    }
  }
}

export default new ConversationDynamicsService();
