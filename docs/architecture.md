# Architecture

```text
Browser trainer
  ├─ localStorage session state
  ├─ real POST /api/v1/quotes
  └─ deterministic POST /api/trainer/checkpoints/{id}
                 │
          ASP.NET Core API
                 │
        Practice.Domain
```

## Boundaries

- `Practice.Domain` owns money, promotion, and validation rules.
- `Practice.Api` owns HTTP translation, scenario delivery, static hosting, and predefined checkpoint probes.
- `wwwroot` owns presentation and local session state; it never duplicates pricing rules.
- The default trainer makes no external network requests and uses no AI credentials.

## Exercise integrity

`main` is fully green. `scripts/start-exercise.*` creates a disposable Git worktree, then replaces only `QuoteCalculator.cs` with the deliberately incomplete starter. The participant works in that isolated directory while the source repository stays intact.

## Deterministic evaluation

Checkpoints accept only known IDs. They invoke fixed in-process domain probes and return stable evidence codes. They do not execute shell commands, source paths, or browser-provided code. Free-text explanations are self-scored against the rubric rather than falsely presented as machine-graded.
