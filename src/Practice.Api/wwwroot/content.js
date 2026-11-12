const catalog = [
  {
    id: 'unfamiliar-codebase', label: 'Unfamiliar codebase', summary: 'Orient quickly without asking AI to rewrite the repository.',
    reasoningOutline: ['Trace one real request end to end.', 'Separate observed facts from assumptions.', 'Find the narrowest owner of the requested behavior.'],
    actions: ['Read the brief and restate the output.', 'Run the documented build and tests.', 'Inspect the entry point and project structure.', 'Trace one representative request.', 'Name the files likely to change.', 'Confirm the smallest test command.', 'Explain the plan before editing.'],
    evidence: ['Baseline build/test result', 'Request-path file map', 'Bounded implementation plan'],
    pitfalls: ['Reading every file', 'Letting AI invent repository conventions'],
    spokenUpdate: 'I traced [request] from [entry point] to [domain owner]. The baseline is [result]. I plan to change only [files] and verify with [tests].',
    prompts: [
      ['orient', 'Map one execution path', 'Orient', 'Trace [request or command] through this repository. Identify the entry point, domain owner, tests, and conventions. Separate facts from assumptions. Do not edit files or propose a broad redesign.'],
      ['execute', 'Implement the narrow slice', 'Execute', 'Implement only [bounded behavior] in [named files]. Preserve [public contract] and existing conventions. Do not modify unrelated code or add packages. Return the diff and assumptions.'],
      ['verify', 'Check repository fit', 'Verify', 'Review only the changed files for correctness and repository fit. Compare against [acceptance criteria], identify missing tests, and cite exact lines. Do not rewrite the solution.']
    ]
  },
  {
    id: 'bug-fix', label: 'Bug fix', summary: 'Reproduce, isolate, fix minimally, and prove the regression is closed.',
    reasoningOutline: ['Turn the report into an observable failure.', 'Find the first point where actual behavior diverges.', 'Prefer the smallest root-cause fix.'],
    actions: ['Restate expected versus actual behavior.', 'Reproduce the failure.', 'Write a failing regression test.', 'Trace data to the divergence point.', 'Make the smallest fix.', 'Run focused and full tests.', 'Explain root cause and blast radius.'],
    evidence: ['Failing regression test before fix', 'Passing focused test after fix', 'Full regression suite result'],
    pitfalls: ['Fixing the symptom instead of the cause', 'Changing the test to match broken behavior'],
    spokenUpdate: 'I reproduced [failure] with [test/input]. The divergence occurs in [location] because [root cause]. I changed [small scope] and verified [focused/full tests].',
    prompts: [
      ['orient', 'Build a reproduction plan', 'Orient', 'Given [bug report], propose the smallest deterministic reproduction and likely observation points. Distinguish evidence from hypotheses. Do not suggest a fix yet.'],
      ['execute', 'Implement the root-cause fix', 'Execute', 'Using failing test [test name], implement only the smallest root-cause fix in [scope]. Preserve [contract]. Do not weaken assertions or refactor unrelated code.'],
      ['verify', 'Adversarial regression review', 'Verify', 'Review only the bug fix against [expected behavior]. Look for symptom-only fixes, missing boundaries, and regressions. Do not change code; return risks and exact additional tests.']
    ]
  },
  {
    id: 'feature', label: 'Feature implementation', summary: 'Deliver one vertical behavior slice from contract to tests.',
    reasoningOutline: ['Translate prose into acceptance examples.', 'Choose one end-to-end tracer bullet.', 'Keep optional improvements outside the critical path.'],
    actions: ['Clarify input, output, errors, and compatibility.', 'Write one failing acceptance test.', 'Identify the domain owner.', 'Implement one vertical slice.', 'Add boundary and error tests.', 'Run the full suite.', 'State trade-offs and deferred work.'],
    evidence: ['Acceptance examples', 'Red-to-green test', 'Full-suite result'],
    pitfalls: ['Building abstractions before behavior', 'Adding unstated features'],
    spokenUpdate: 'The required behavior is [input → output]. I implemented one vertical slice through [layers], preserved [contract], and verified [happy/error/boundary tests].',
    prompts: [
      ['orient', 'Convert brief to acceptance cases', 'Orient', 'Convert [feature brief] into concrete happy, boundary, and error examples. Identify ambiguities and compatibility constraints. Do not design or implement beyond the stated scope.'],
      ['execute', 'Build one vertical slice', 'Execute', 'Implement only [acceptance case] through the existing layers. Preserve [API/behavior], follow [repository convention], and do not add speculative abstractions. Include the focused test.'],
      ['verify', 'Audit against acceptance criteria', 'Verify', 'Compare the implementation only against [acceptance criteria]. Identify unmet behavior, accidental scope, compatibility risk, and missing tests. Do not propose unrelated improvements.']
    ]
  },
  {
    id: 'refactor', label: 'Refactoring', summary: 'Improve structure while proving observable behavior does not change.',
    reasoningOutline: ['Define the behavior that must remain invariant.', 'Name the concrete design pressure.', 'Refactor in reversible steps.'],
    actions: ['Run and record characterization tests.', 'State the smell and its cost.', 'Choose one structural goal.', 'Make a small mechanical change.', 'Run tests after each step.', 'Review the public diff.', 'Explain what was intentionally not redesigned.'],
    evidence: ['Characterization tests', 'Before/after structural comparison', 'Unchanged external behavior'],
    pitfalls: ['Combining behavior changes with cleanup', 'Applying patterns without a real pressure'],
    spokenUpdate: 'I preserved [observable behavior], addressed [specific smell], and limited the refactor to [scope]. Characterization and full tests show [result].',
    prompts: [
      ['orient', 'Identify the real design pressure', 'Orient', 'Inspect [scope] and identify duplicated responsibility, coupling, or test friction with exact evidence. Rank only the top two pressures. Do not propose patterns or edit code yet.'],
      ['execute', 'Perform one behavior-preserving step', 'Execute', 'Refactor only [specific pressure] while preserving [public behavior]. Use existing characterization tests, do not add features, and keep the diff mechanically reviewable.'],
      ['verify', 'Behavior-preservation review', 'Verify', 'Review the refactor only for observable behavior changes, hidden coupling, and unnecessary abstraction. Cite [tests/contracts] that prove safety. Do not redesign it again.']
    ]
  },
  {
    id: 'testing', label: 'Test-writing assignment', summary: 'Design tests that prove behavior rather than mirror implementation.',
    reasoningOutline: ['Extract externally observable rules.', 'Prioritize boundaries and failure modes.', 'Make every failure diagnostically useful.'],
    actions: ['List behaviors and invariants.', 'Inspect existing test style.', 'Choose the smallest meaningful test.', 'Watch it fail for the expected reason.', 'Add boundaries and invalid inputs.', 'Remove redundant cases.', 'Run tests repeatedly for determinism.'],
    evidence: ['Expected red failure', 'Boundary coverage matrix', 'Stable full-suite run'],
    pitfalls: ['Testing private implementation details', 'Mocking the behavior under test'],
    spokenUpdate: 'I derived tests from [rules], prioritized [boundaries/failures], and avoided coupling to [implementation detail]. The tests fail meaningfully and pass deterministically.',
    prompts: [
      ['orient', 'Derive a behavior matrix', 'Orient', 'From [requirements and code], produce a compact behavior matrix: happy path, boundaries, invalid inputs, and invariants. Do not write tests or mirror private methods.'],
      ['execute', 'Write one meaningful test', 'Execute', 'Write only the test for [behavior]. Follow [existing test style], use real domain code where possible, and do not mock the result being asserted. State why it should fail first.'],
      ['verify', 'Detect weak tests', 'Verify', 'Review only [test files] for false positives, implementation coupling, missing boundaries, and non-determinism. Do not add broad coverage; recommend the smallest high-value correction.']
    ]
  },
  {
    id: 'api-integration', label: 'API integration', summary: 'Treat external calls as unreliable and make contracts explicit.',
    reasoningOutline: ['Define request, response, and failure contracts.', 'Keep transport concerns outside domain logic.', 'Design retries and timeouts for idempotency.'],
    actions: ['Inspect official contract/sample payloads.', 'Model typed request and response data.', 'Set timeout and cancellation behavior.', 'Handle non-success and malformed responses.', 'Test with a local fake HTTP server.', 'Verify logging redacts secrets.', 'Explain retry and fallback policy.'],
    evidence: ['Captured request shape', 'Success and failure contract tests', 'Timeout/cancellation test'],
    pitfalls: ['Retrying non-idempotent operations blindly', 'Leaking credentials or response bodies'],
    spokenUpdate: 'The integration contract is [shape]. I isolated transport in [component], handle [failures], and verified request/response behavior with [contract tests].',
    prompts: [
      ['orient', 'Map the integration contract', 'Orient', 'Analyze [API documentation/sample] and list required fields, authentication boundary, success responses, error responses, timeout, and idempotency. Do not generate client code yet.'],
      ['execute', 'Implement the transport boundary', 'Execute', 'Implement only [endpoint operation] behind [interface]. Preserve domain independence, limit retries to [safe cases], and do not log [sensitive fields]. Include a fake-server contract test.'],
      ['verify', 'Failure-mode audit', 'Verify', 'Review only [integration component] for timeout, cancellation, retry safety, malformed responses, secret leakage, and error mapping. Do not redesign unrelated domain code.']
    ]
  },
  {
    id: 'performance', label: 'Performance optimization', summary: 'Measure first, optimize the dominant cost, and protect correctness.',
    reasoningOutline: ['Define the workload and target metric.', 'Profile before changing code.', 'Trade complexity only for measured gain.'],
    actions: ['State latency/throughput/memory target.', 'Create a representative benchmark.', 'Capture the baseline.', 'Profile the hot path.', 'Change one dominant cost.', 'Re-run benchmark and correctness tests.', 'Explain complexity and regression guard.'],
    evidence: ['Reproducible baseline', 'Profile or allocation evidence', 'Before/after benchmark with correctness tests'],
    pitfalls: ['Optimizing intuition instead of measurements', 'Using unrealistic microbenchmarks'],
    spokenUpdate: 'For workload [description], baseline [metric] was [value]. Profiling identified [cost]. The bounded change produced [result] while [correctness tests] stayed green.',
    prompts: [
      ['orient', 'Design a representative benchmark', 'Orient', 'Define a benchmark for [workload] with input sizes, warm-up, metric, and success threshold. Identify confounders. Do not suggest optimizations before baseline data.'],
      ['execute', 'Optimize one measured hotspot', 'Execute', 'Optimize only [profiled hotspot] under [constraint]. Preserve [behavior], avoid unrelated refactors, and include a benchmark plus correctness test.'],
      ['verify', 'Challenge the performance claim', 'Verify', 'Review only [benchmark and diff] for benchmark bias, changed semantics, allocation trade-offs, and worst-case regression. Do not accept unmeasured claims.']
    ]
  },
  {
    id: 'security', label: 'Security hardening', summary: 'Protect a named asset with deterministic controls and negative tests.',
    reasoningOutline: ['Name the asset, actor, and trust boundary.', 'Prefer deterministic authorization and validation.', 'Prove unsafe inputs are rejected.'],
    actions: ['Map inputs and trust boundaries.', 'State abuse cases.', 'Identify the existing authorization point.', 'Add a failing negative test.', 'Implement one deterministic control.', 'Check logs and errors for leakage.', 'Run security and regression tests.'],
    evidence: ['Threat/abuse-case list', 'Negative test proving rejection', 'Authorization or validation evidence'],
    pitfalls: ['Treating prompts as a security boundary', 'Logging secrets or detailed internal errors'],
    spokenUpdate: 'The protected asset is [asset] across [trust boundary]. I addressed [abuse case] with [deterministic control] and proved rejection using [negative test].',
    prompts: [
      ['orient', 'Map trust boundaries', 'Orient', 'For [feature], identify assets, actors, inputs, trust boundaries, and top abuse cases. Separate authorization from validation. Do not produce exploit steps or edit code.'],
      ['execute', 'Add one deterministic control', 'Execute', 'Implement only the control for [abuse case] at [boundary]. Preserve valid behavior, do not rely on prompt instructions, and add a negative test that proves rejection.'],
      ['verify', 'Security diff review', 'Verify', 'Review only [security diff] for authorization bypass, injection, secret leakage, unsafe defaults, and overly detailed errors. Limit recommendations to concrete findings with exact locations.']
    ]
  },
  {
    id: 'code-review', label: 'Code review', summary: 'Find concrete correctness risks before discussing style.',
    reasoningOutline: ['Understand intent and changed behavior.', 'Prioritize correctness, security, and regression risk.', 'Attach every finding to evidence.'],
    actions: ['Read requirements and tests.', 'Inspect the diff before surrounding code.', 'Trace changed data paths.', 'Check error and boundary behavior.', 'Run focused verification.', 'Rank findings by severity.', 'Summarize approval blockers separately from suggestions.'],
    evidence: ['Exact file/line findings', 'Reproduction or failing test', 'Severity and user impact'],
    pitfalls: ['Commenting on style while missing defects', 'Making claims without a reproduction path'],
    spokenUpdate: 'The change intends to [goal]. I found [count] blocking issue(s), led by [risk] at [location], demonstrated by [test/reproduction]. Non-blocking suggestions are separate.',
    prompts: [
      ['orient', 'Understand the diff intent', 'Orient', 'Summarize only the behavioral intent of [diff/PR], changed contracts, and highest-risk paths. Do not review style or invent requirements.'],
      ['execute', 'Run a risk-first review', 'Execute', 'Review only [diff] for correctness, security, regressions, and missing tests. Every finding must include severity, exact location, impact, and reproduction. Limit style comments.'],
      ['verify', 'Challenge review findings', 'Verify', 'Validate only these proposed findings against [code/tests]. Remove speculative claims, downgrade unsupported severity, and identify any missed blocker. Do not rewrite the implementation.']
    ]
  },
  {
    id: 'data-migration', label: 'Database or data migration', summary: 'Make transformations restartable, observable, and reversible.',
    reasoningOutline: ['Define source and target invariants.', 'Assume partial execution and retries.', 'Separate schema rollout from destructive cleanup.'],
    actions: ['Measure current data shape and volume.', 'Write source/target invariants.', 'Choose expand-migrate-contract sequencing.', 'Implement idempotent batches.', 'Add progress and failure telemetry.', 'Test interruption and rerun.', 'Document rollback and validation queries.'],
    evidence: ['Pre/post validation queries', 'Idempotent rerun test', 'Rollback or recovery procedure'],
    pitfalls: ['One giant transaction', 'Dropping old data before validation'],
    spokenUpdate: 'The migration transforms [source] to [target] using [sequence]. It is restartable through [idempotency], validated by [queries], and recoverable through [rollback].',
    prompts: [
      ['orient', 'Design migration invariants', 'Orient', 'For migration [description], define source/target invariants, volume assumptions, compatibility window, and failure states. Do not generate destructive SQL yet.'],
      ['execute', 'Implement a restartable batch', 'Execute', 'Implement only [migration batch] with [batch key]. Preserve backward compatibility, make retries idempotent, and do not drop old fields. Include progress and validation output.'],
      ['verify', 'Interruption and rollback audit', 'Verify', 'Review only this migration for partial failure, rerun safety, locking, validation gaps, and rollback. Do not approve destructive cleanup without [required evidence].']
    ]
  },
  {
    id: 'frontend-ui', label: 'Frontend or UI task', summary: 'Turn user states into accessible interactions, not only a happy screenshot.',
    reasoningOutline: ['Map user goal and state transitions.', 'Treat loading, empty, error, and success as required behavior.', 'Verify keyboard and narrow-screen use.'],
    actions: ['Restate the primary user task.', 'Inspect existing components and tokens.', 'List interaction states.', 'Implement one accessible flow.', 'Add error and empty states.', 'Test keyboard and 320px layout.', 'Inspect rendered output and console errors.'],
    evidence: ['State/interaction map', 'Keyboard and accessibility check', 'Desktop/mobile screenshots'],
    pitfalls: ['Polishing only the default state', 'Using color as the only status signal'],
    spokenUpdate: 'The primary user task is [goal]. I implemented states [list], reused [components/tokens], and verified keyboard, error, and [mobile width] behavior.',
    prompts: [
      ['orient', 'Map UI states', 'Orient', 'For user goal [goal], map default, loading, empty, error, blocked, and success states using existing [components/tokens]. Do not design extra features.'],
      ['execute', 'Build one accessible flow', 'Execute', 'Implement only the flow from [start] to [success]. Preserve [design system], use semantic controls, and do not add remote dependencies. Include keyboard and error behavior.'],
      ['verify', 'Rendered UX audit', 'Verify', 'Review only the rendered flow at [desktop/mobile sizes] for clipping, focus order, contrast, status semantics, and missing states. Do not judge from source code alone.']
    ]
  },
  {
    id: 'async-concurrency', label: 'Async or concurrency task', summary: 'Make ownership, cancellation, ordering, and failure semantics explicit.',
    reasoningOutline: ['Define which work may overlap.', 'Name ordering and consistency guarantees.', 'Treat cancellation and duplicate delivery as normal.'],
    actions: ['Draw the work and data ownership path.', 'State ordering/idempotency requirements.', 'Write a deterministic race or cancellation test.', 'Choose synchronization or message semantics.', 'Implement bounded concurrency.', 'Test timeout, cancellation, and duplicate work.', 'Explain backpressure and failure recovery.'],
    evidence: ['Concurrency invariant', 'Deterministic cancellation/race test', 'Failure and retry behavior'],
    pitfalls: ['Fire-and-forget work', 'Tests that depend on arbitrary sleeps'],
    spokenUpdate: 'The concurrency invariant is [invariant]. Work may overlap at [boundary] but ordering is preserved by [mechanism]. I verified cancellation, duplicates, and [failure].',
    prompts: [
      ['orient', 'Define concurrency invariants', 'Orient', 'For [async workflow], identify ownership, allowed overlap, ordering, idempotency, cancellation, and backpressure. Do not suggest locks before stating the invariants.'],
      ['execute', 'Implement bounded async behavior', 'Execute', 'Implement only [async behavior] with [concurrency limit/cancellation token]. Preserve [ordering or consistency], avoid fire-and-forget work, and add a deterministic test without arbitrary sleeps.'],
      ['verify', 'Race and cancellation review', 'Verify', 'Review only [async change] for lost exceptions, duplicate work, deadlocks, cancellation leaks, ordering violations, and unbounded concurrency. Do not accept timing-only tests.']
    ]
  },
  {
    id: 'cli-automation', label: 'CLI or automation task', summary: 'Design for repeatability, safe reruns, explicit exit codes, and clean artifacts.',
    reasoningOutline: ['Define inputs, outputs, and side effects.', 'Make dry-run and rerun behavior explicit.', 'Treat exit codes and artifacts as the contract.'],
    actions: ['Specify command syntax and examples.', 'Validate inputs before side effects.', 'Implement one end-to-end happy path.', 'Add dry-run or preview when destructive.', 'Handle partial failure and cleanup.', 'Test exit codes and artifact schema.', 'Verify from a clean directory.'],
    evidence: ['Command help/example', 'Exit-code tests', 'Validated output artifact'],
    pitfalls: ['Printing success before verifying output', 'Non-idempotent reruns that duplicate work'],
    spokenUpdate: 'The command accepts [inputs], creates [artifacts], and returns [exit codes]. I made reruns [behavior] and verified the complete path from [clean state].',
    prompts: [
      ['orient', 'Define the command contract', 'Orient', 'For automation [goal], define CLI syntax, inputs, outputs, side effects, exit codes, rerun behavior, and destructive boundaries. Do not implement yet.'],
      ['execute', 'Build the end-to-end command', 'Execute', 'Implement only command [name] from validated input to [artifact]. Preserve idempotency, limit side effects to [scope], and include explicit nonzero failure codes.'],
      ['verify', 'Clean-environment verification', 'Verify', 'Review and run only the installed command from [clean state]. Validate exit codes, artifact schema, rerun behavior, cleanup, and failure messages. Do not rely only on imported functions.']
    ]
  }
];

export const assignmentPlaybooks = catalog.map(({ prompts, ...playbook }) => playbook);

export const promptTemplates = catalog.flatMap(playbook =>
  playbook.prompts.map(([suffix, title, phase, body]) => ({
    id: `${playbook.id}-${suffix}`,
    assignmentType: playbook.id,
    title,
    phase,
    body
  }))
);

export function promptsForAssignment(assignmentType) {
  return promptTemplates.filter(prompt => prompt.assignmentType === assignmentType);
}
