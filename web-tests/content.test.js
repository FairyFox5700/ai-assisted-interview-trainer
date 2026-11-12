import test from 'node:test';
import assert from 'node:assert/strict';
import { assignmentPlaybooks, promptTemplates, promptsForAssignment } from '../src/Practice.Api/wwwroot/content.js';

test('catalog covers thirteen distinct assignment types', () => {
  assert.equal(assignmentPlaybooks.length, 13);
  assert.equal(promptTemplates.length, 39);
  assert.equal(new Set(assignmentPlaybooks.map(item => item.id)).size, assignmentPlaybooks.length);
});

test('every assignment has an actionable reasoning outline and verification evidence', () => {
  for (const playbook of assignmentPlaybooks) {
    assert.ok(playbook.label);
    assert.ok(playbook.reasoningOutline.length >= 3, `${playbook.id} needs a reasoning outline`);
    assert.ok(playbook.actions.length >= 6, `${playbook.id} needs at least six actions`);
    assert.ok(playbook.evidence.length >= 3, `${playbook.id} needs verification evidence`);
    assert.ok(playbook.pitfalls.length >= 2, `${playbook.id} needs common pitfalls`);
    assert.match(playbook.spokenUpdate, /\[/, `${playbook.id} needs editable placeholders`);
  }
});

test('every assignment has prompts for orient, execute, and verify phases', () => {
  for (const playbook of assignmentPlaybooks) {
    const prompts = promptsForAssignment(playbook.id);
    assert.ok(prompts.length >= 3, `${playbook.id} needs three prompts`);
    assert.deepEqual(new Set(prompts.map(prompt => prompt.phase)), new Set(['Orient', 'Execute', 'Verify']));
  }
});

test('prompt IDs are unique and prompts are bounded and editable', () => {
  assert.equal(new Set(promptTemplates.map(item => item.id)).size, promptTemplates.length);
  for (const prompt of promptTemplates) {
    assert.match(prompt.body, /\[/, `${prompt.id} needs at least one placeholder`);
    assert.match(prompt.body.toLowerCase(), /(do not|only|preserve|limit)/, `${prompt.id} needs a boundary`);
    assert.doesNotMatch(prompt.body.toLowerCase(), /chain[- ]of[- ]thought/);
  }
});
