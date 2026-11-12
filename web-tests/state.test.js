import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSession,
  remainingSeconds,
  completeRequirement,
  canRevealNextStage,
  revealNextStage
} from '../src/Practice.Api/wwwroot/state.js';

const scenario = {
  totalMinutes: 60,
  stages: [
    { id: 'inspect', requirements: ['a', 'b'] },
    { id: 'bug', requirements: ['c'] }
  ]
};

test('new session reveals only the first stage', () => {
  const session = createSession(scenario);
  assert.deepEqual(session.revealedStageIds, ['inspect']);
  assert.equal(session.activeStageIndex, 0);
});

test('timer derives remaining time from persisted start timestamp', () => {
  const session = { startedAt: 1_000, durationSeconds: 3_600, pausedSeconds: 0 };
  assert.equal(remainingSeconds(session, 61_000), 3_540);
});

test('next stage stays locked until every current requirement is complete', () => {
  let session = createSession(scenario);
  session = { ...session, status: 'running' };
  session = completeRequirement(session, 'inspect', 0);
  assert.equal(canRevealNextStage(session, scenario), false);
  session = completeRequirement(session, 'inspect', 1);
  assert.equal(canRevealNextStage(session, scenario), true);
});

test('revealing next stage is immutable and records an event', () => {
  let session = createSession(scenario);
  session = { ...session, status: 'running', completedRequirements: { inspect: [0, 1] } };
  const next = revealNextStage(session, scenario, 42);
  assert.notEqual(next, session);
  assert.deepEqual(next.revealedStageIds, ['inspect', 'bug']);
  assert.equal(next.events.at(-1).type, 'stage_revealed');
  assert.equal(next.events.at(-1).at, 42);
});
