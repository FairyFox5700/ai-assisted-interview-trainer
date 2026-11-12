import {
  createSession,
  remainingSeconds,
  completeRequirement,
  canRevealNextStage,
  revealNextStage,
  saveSession,
  loadSession,
  clearSession
} from './state.js';
import { assignmentPlaybooks, promptsForAssignment } from './content.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let scenario;
let session;
let apiReady = false;
let timerHandle;
let noteSaveHandle;
let selectedAssignmentType = 'bug-fix';
let renderedAssignmentType;

async function bootstrap() {
  bindStaticEvents();
  try {
    const [scenarioResponse, healthResponse] = await Promise.all([
      fetch('/api/trainer/scenario'),
      fetch('/health')
    ]);
    if (!scenarioResponse.ok || !healthResponse.ok) throw new Error('API unavailable');
    scenario = await scenarioResponse.json();
    const health = await healthResponse.json();
    apiReady = health.status === 'ready';
    session = loadSession();
    if (!session || session.scenarioId !== scenario.id) session = createSession(scenario);
    setEnvironment('ready', `API ready · contract ${health.contractVersion}`);
    $('#dialog-api-indicator').classList.add('ready');
    $('#scenario-subtitle').textContent = scenario.subtitle;
    renderAll();
    startTimerLoop();
  } catch (error) {
    setEnvironment('error', 'API unavailable');
    $('#scenario-subtitle').textContent = 'Could not load the practice environment';
    $('#start-button').disabled = true;
    showToast('Start the .NET API, then refresh.');
  }
}

function bindStaticEvents() {
  $('#start-button').addEventListener('click', () => $('#start-dialog').showModal());
  $('#confirm-start').addEventListener('click', () => {
    if (!apiReady) return;
    session = {
      ...session,
      status: 'running',
      startedAt: session.startedAt ?? Date.now(),
      events: [...session.events, event('run_started', 'Simulation started')]
    };
    persist('Run started');
    renderAll();
  });
  $('#end-button').addEventListener('click', () => {
    session = { ...session, status: 'completed', events: [...session.events, event('run_ended', 'Run ended by candidate')] };
    persist('Run completed');
    renderAll();
    selectTab('debrief');
  });
  $('#reset-button').addEventListener('click', () => {
    if (!confirm('Reset the timer, notes, activity, and all stage progress?')) return;
    clearSession();
    session = createSession(scenario);
    persist('Progress reset');
    renderAll();
  });
  $('#checkpoint-button').addEventListener('click', runCheckpoint);
  $('#reveal-button').addEventListener('click', () => {
    const before = session.activeStageIndex;
    session = revealNextStage(session, scenario);
    if (session.activeStageIndex !== before) {
      persist(`Stage ${session.activeStageIndex + 1} revealed`);
      renderAll();
      announce(`Stage ${session.activeStageIndex + 1} revealed`);
    }
  });
  $('#send-request').addEventListener('click', sendQuote);
  $('#copy-prompt').addEventListener('click', async () => {
    await copyText($('#prompt-editor').value);
    session = { ...session, promptHistory: [...session.promptHistory, { at: Date.now(), text: $('#prompt-editor').value }], events: [...session.events, event('prompt_copied', 'AI prompt copied')] };
    persist('Prompt recorded');
    renderActivity();
  });
  $('#assignment-type').addEventListener('change', (event) => {
    selectedAssignmentType = event.target.value;
    renderPrompts();
  });
  $('#copy-playbook').addEventListener('click', async () => {
    const playbook = assignmentPlaybooks.find(item => item.id === selectedAssignmentType);
    await copyText(formatPlaybook(playbook));
  });
  $('#notes').addEventListener('input', (e) => {
    session = { ...session, notes: e.target.value };
    $('#save-state').textContent = 'Unsaved notes';
    clearTimeout(noteSaveHandle);
    noteSaveHandle = setTimeout(() => persist('Notes saved', false), 350);
  });
  $('#clear-activity').addEventListener('click', () => {
    session = { ...session, events: [] };
    persist('Activity cleared', false);
    renderActivity();
  });
  $('#export-button').addEventListener('click', exportSummary);
  $$('.workspace-tabs button').forEach(button => button.addEventListener('click', () => selectTab(button.dataset.tab)));
  $$('.command-copy').forEach(button => button.addEventListener('click', () => copyText(button.dataset.copy)));
}

function renderAll() {
  document.documentElement.dataset.sessionStatus = session.status;
  $('#start-button').textContent = session.status === 'running' ? 'Running' : session.startedAt ? 'Resume' : 'Start simulation';
  $('#start-button').disabled = !apiReady || session.status === 'running' || ['completed', 'expired'].includes(session.status);
  $('#end-button').disabled = session.status !== 'running';
  $('#checkpoint-button').disabled = session.status !== 'running';
  $('#notes').value = session.notes ?? '';
  renderStages();
  renderCurrentStage();
  renderPrompts();
  renderActivity();
  renderDebrief();
  updateTimer();
}

function renderStages() {
  $('#stage-progress').textContent = `${session.revealedStageIds.length} / ${scenario.stages.length}`;
  $('#stage-list').innerHTML = scenario.stages.map((stage, index) => {
    const revealed = session.revealedStageIds.includes(stage.id);
    const active = index === session.activeStageIndex;
    const completed = index < session.activeStageIndex;
    const label = revealed ? stage.title : 'Locked stage';
    const state = completed ? 'Complete' : active ? 'Current' : revealed ? 'Available' : 'Complete current gate';
    return `<li><button class="stage-button ${active ? 'active' : ''} ${revealed ? '' : 'locked'}" ${revealed ? '' : 'disabled'} aria-current="${active ? 'step' : 'false'}">
      <span class="stage-index">${completed ? '✓' : index + 1}</span>
      <span class="stage-meta"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(state)}</span></span>
      <span class="stage-time">${stage.minutes}m</span>
    </button></li>`;
  }).join('');
}

function renderCurrentStage() {
  const stage = scenario.stages[session.activeStageIndex];
  $('#stage-kicker').textContent = `Stage ${session.activeStageIndex + 1} · ${stage.minutes} minutes`;
  $('#stage-title').textContent = stage.title;
  $('#stage-objective').textContent = stage.objective;
  const completed = new Set(session.completedRequirements[stage.id] ?? []);
  $('#requirements').innerHTML = stage.requirements.map((requirement, index) => `
    <div class="requirement ${completed.has(index) ? 'completed' : ''}">
      <input id="requirement-${index}" type="checkbox" ${completed.has(index) ? 'checked' : ''} ${session.status !== 'running' ? 'disabled' : ''}>
      <label for="requirement-${index}">${escapeHtml(requirement)}</label>
    </div>`).join('');
  stage.requirements.forEach((_, index) => {
    $(`#requirement-${index}`).addEventListener('change', () => {
      session = completeRequirement(session, stage.id, index);
      session = { ...session, events: [...session.events, event('requirement_updated', `Requirement ${index + 1} updated`)] };
      persist('Requirement saved');
      renderCurrentStage();
      renderActivity();
    });
  });
  const canReveal = session.status === 'running' && canRevealNextStage(session, scenario);
  $('#reveal-button').disabled = !canReveal;
  $('#reveal-button').hidden = session.activeStageIndex === scenario.stages.length - 1;
  const count = completed.size;
  $('#stage-gate-copy').textContent = session.activeStageIndex === scenario.stages.length - 1
    ? 'Final stage: run the full checkpoint and complete your debrief.'
    : `${count} of ${stage.requirements.length} requirements confirmed.`;
}

function renderPrompts() {
  const playbook = assignmentPlaybooks.find(item => item.id === selectedAssignmentType) ?? assignmentPlaybooks[0];
  const prompts = promptsForAssignment(playbook.id);
  const assignmentChanged = renderedAssignmentType !== playbook.id;
  renderedAssignmentType = playbook.id;

  $('#assignment-type').innerHTML = assignmentPlaybooks.map(item =>
    `<option value="${item.id}" ${item.id === playbook.id ? 'selected' : ''}>${escapeHtml(item.label)}</option>`
  ).join('');
  $('#playbook-title').textContent = playbook.label;
  $('#playbook-summary').textContent = playbook.summary;
  $('#reasoning-outline').innerHTML = playbook.reasoningOutline.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  $('#action-plan').innerHTML = playbook.actions.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  $('#evidence-list').innerHTML = playbook.evidence.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  $('#pitfall-list').innerHTML = playbook.pitfalls.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  $('#spoken-update').textContent = playbook.spokenUpdate;

  $('#prompt-templates').innerHTML = prompts.map((template, index) => `
    <button class="template-button ${index === 0 ? 'active' : ''}" data-template="${template.id}">
      <strong>${escapeHtml(template.title)}</strong><span>${escapeHtml(template.phase)}</span>
    </button>`).join('');
  if (assignmentChanged || !$('#prompt-editor').value) $('#prompt-editor').value = prompts[0].body;
  $$('.template-button').forEach(button => button.addEventListener('click', () => {
    $$('.template-button').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    $('#prompt-editor').value = prompts.find(template => template.id === button.dataset.template).body;
  }));
}

function renderActivity() {
  const events = [...(session.events ?? [])].reverse().slice(0, 12);
  $('#activity-log').innerHTML = events.length ? events.map(item => `
    <li class="activity-item"><div><strong>${escapeHtml(item.label ?? eventLabel(item))}</strong><span>${formatTime(item.at)}</span></div></li>`).join('')
    : '<li class="activity-item"><div><strong>No activity yet</strong><span>Start the simulation to create an evidence trail.</span></div></li>';
}

function renderDebrief() {
  const seconds = session.startedAt ? Math.min(session.durationSeconds, Math.floor((Date.now() - session.startedAt) / 1000)) : 0;
  const completedCount = Object.values(session.completedRequirements ?? {}).reduce((sum, values) => sum + values.length, 0);
  const checkpointPasses = Object.values(session.checkpointResults ?? {}).filter(result => result.passed).length;
  $('#run-facts').innerHTML = [
    ['Status', titleCase(session.status)],
    ['Elapsed', formatDuration(seconds)],
    ['Requirements', completedCount],
    ['Checkpoints', checkpointPasses]
  ].map(([label, value]) => `<div class="fact"><span>${label}</span><strong>${value}</strong></div>`).join('');
  $('#rubric-form').innerHTML = scenario.rubric.map((dimension, index) => `
    <div class="rubric-row"><label for="rubric-${index}">${escapeHtml(dimension)}</label>
    <select id="rubric-${index}" data-dimension="${escapeHtml(dimension)}">
      <option value="">Select score</option>${[1,2,3,4,5].map(score => `<option value="${score}" ${String(session.rubric?.[dimension]) === String(score) ? 'selected' : ''}>${score} — ${scoreLabel(score)}</option>`).join('')}
    </select></div>`).join('');
  $$('#rubric-form select').forEach(select => select.addEventListener('change', () => {
    session = { ...session, rubric: { ...session.rubric, [select.dataset.dimension]: Number(select.value) || null } };
    persist('Self-score saved', false);
  }));
}

async function runCheckpoint() {
  const stage = scenario.stages[session.activeStageIndex];
  const output = $('#checkpoint-output');
  output.className = '';
  output.textContent = 'Running predefined domain probes…';
  try {
    const response = await fetch(`/api/trainer/checkpoints/${stage.checkpoint}`, { method: 'POST' });
    const result = await response.json();
    session = {
      ...session,
      checkpointResults: { ...session.checkpointResults, [stage.checkpoint]: result },
      events: [...session.events, event('checkpoint', `${stage.title} checkpoint: ${result.status}`)]
    };
    persist('Checkpoint saved');
    output.classList.add(result.passed ? 'pass' : 'fail');
    output.textContent = JSON.stringify(result, null, 2);
    renderActivity();
    renderDebrief();
  } catch (error) {
    output.classList.add('fail');
    output.textContent = `Checkpoint unavailable: ${error.message}`;
  }
}

async function sendQuote() {
  const status = $('#response-status');
  const output = $('#response-body');
  status.textContent = 'Sending…';
  try {
    const body = JSON.parse($('#request-body').value);
    const started = performance.now();
    const response = await fetch('/api/v1/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const text = await response.text();
    const elapsed = Math.round(performance.now() - started);
    status.textContent = `${response.status} · ${elapsed} ms`;
    output.textContent = prettyJson(text);
    session = { ...session, events: [...session.events, event('api_request', `Quote API returned ${response.status}`)] };
    persist('API evidence saved');
    renderActivity();
  } catch (error) {
    status.textContent = 'Request failed';
    output.textContent = error.message;
  }
}

function startTimerLoop() {
  clearInterval(timerHandle);
  timerHandle = setInterval(updateTimer, 1000);
  updateTimer();
}

function updateTimer() {
  if (!session) return;
  const seconds = remainingSeconds(session);
  if (session.status === 'running' && seconds === 0) {
    session = { ...session, status: 'expired', events: [...session.events, event('expired', 'Time expired')] };
    persist('Run expired');
    renderAll();
    announce('Time expired');
    return;
  }
  const timer = $('#timer');
  timer.textContent = formatDuration(seconds);
  timer.classList.toggle('warning', seconds <= 600 && seconds > 120);
  timer.classList.toggle('critical', seconds <= 120);
}

function selectTab(name) {
  $$('.workspace-tabs button').forEach(button => button.setAttribute('aria-selected', String(button.dataset.tab === name)));
  $$('.tab-panel').forEach(panel => panel.hidden = panel.id !== `panel-${name}`);
}

function persist(label, addEvent = false) {
  if (addEvent) session = { ...session, events: [...session.events, event('saved', label)] };
  saveSession(session);
  $('#save-state').textContent = label;
  setTimeout(() => { if ($('#save-state').textContent === label) $('#save-state').textContent = 'Saved locally'; }, 1200);
}

function formatPlaybook(playbook) {
  const numbered = items => items.map((item, index) => `${index + 1}. ${item}`).join('\n');
  const bullets = items => items.map(item => `- ${item}`).join('\n');
  return `${playbook.label}\n\nReasoning outline\n${numbered(playbook.reasoningOutline)}\n\nMy actions\n${numbered(playbook.actions)}\n\nEvidence to produce\n${bullets(playbook.evidence)}\n\nCommon traps\n${bullets(playbook.pitfalls)}\n\nInterviewer update\n${playbook.spokenUpdate}`;
}

function event(type, label) { return { type, label, at: Date.now() }; }
function eventLabel(item) {
  const labels = { stage_revealed: `Stage revealed: ${item.stageId}`, checkpoint: 'Checkpoint completed', api_request: 'API request completed' };
  return labels[item.type] ?? titleCase(String(item.type ?? 'activity').replaceAll('_', ' '));
}
function setEnvironment(state, text) { const badge = $('#environment-badge'); badge.className = `status-pill ${state}`; badge.textContent = text; }
function formatDuration(seconds) { const min = Math.floor(seconds / 60); const sec = seconds % 60; return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`; }
function formatTime(timestamp) { return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function titleCase(value) { return value.charAt(0).toUpperCase() + value.slice(1); }
function scoreLabel(score) { return ['Needs practice', 'Developing', 'Competent', 'Strong', 'Interview-ready'][score - 1]; }
function prettyJson(text) { try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; } }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]); }
async function copyText(text) { await navigator.clipboard.writeText(text); showToast('Copied to clipboard'); }
function announce(text) { $('#toast').textContent = text; showToast(text); }
function showToast(text) { const toast = $('#toast'); toast.textContent = text; toast.classList.add('visible'); setTimeout(() => toast.classList.remove('visible'), 1800); }

function exportSummary() {
  const report = {
    scenario: scenario.title,
    status: session.status,
    stagesRevealed: session.revealedStageIds,
    checkpointResults: session.checkpointResults,
    rubric: session.rubric,
    notes: session.notes,
    exportedAt: new Date().toISOString()
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'interview-run-summary.json';
  link.click();
  URL.revokeObjectURL(url);
}

bootstrap();
