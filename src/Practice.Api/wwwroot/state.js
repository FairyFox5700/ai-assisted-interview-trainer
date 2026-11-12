const STORAGE_KEY = 'ai-interview-trainer.session.v1';

export function createSession(scenario) {
  return {
    scenarioId: scenario.id ?? 'checkout-v1',
    status: 'ready',
    activeStageIndex: 0,
    revealedStageIds: [scenario.stages[0].id],
    completedRequirements: {},
    checkpointResults: {},
    notes: '',
    promptHistory: [],
    rubric: {},
    startedAt: null,
    durationSeconds: scenario.totalMinutes * 60,
    pausedSeconds: 0,
    events: []
  };
}

export function remainingSeconds(session, now = Date.now()) {
  if (!session.startedAt) return session.durationSeconds;
  const elapsed = Math.floor((now - session.startedAt) / 1000) - (session.pausedSeconds ?? 0);
  return Math.max(0, session.durationSeconds - elapsed);
}

export function completeRequirement(session, stageId, index) {
  const existing = new Set(session.completedRequirements[stageId] ?? []);
  if (existing.has(index)) existing.delete(index);
  else existing.add(index);
  return {
    ...session,
    completedRequirements: {
      ...session.completedRequirements,
      [stageId]: [...existing].sort((a, b) => a - b)
    }
  };
}

export function canRevealNextStage(session, scenario) {
  const stage = scenario.stages[session.activeStageIndex];
  if (!stage || session.activeStageIndex >= scenario.stages.length - 1) return false;
  const completed = session.completedRequirements[stage.id] ?? [];
  return completed.length === stage.requirements.length;
}

export function revealNextStage(session, scenario, now = Date.now()) {
  if (!canRevealNextStage(session, scenario)) return session;
  const nextIndex = session.activeStageIndex + 1;
  const stage = scenario.stages[nextIndex];
  return {
    ...session,
    activeStageIndex: nextIndex,
    revealedStageIds: [...session.revealedStageIds, stage.id],
    events: [...session.events, { type: 'stage_revealed', stageId: stage.id, at: now }]
  };
}

export function saveSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}
