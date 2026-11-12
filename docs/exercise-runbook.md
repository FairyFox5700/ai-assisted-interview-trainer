# Exercise runbook

## Timing

| Stage | Minutes | Goal |
|---|---:|---|
| Inspect | 8 | Map the request path and establish a baseline |
| Bug fix | 15 | Make `SAVE10` exclude shipping |
| Feature | 17 | Add per-SKU `BULK5` with a $15 cap |
| Edge cases | 10 | Validate quantities, empty baskets, and rounding |
| Review | 10 | Run the full suite and explain decisions |

## Interview discipline

1. Read the visible requirements before prompting AI.
2. Run the existing tests and state the baseline.
3. Write one focused failing test.
4. Delegate only a bounded task to AI.
5. Read the generated diff line by line.
6. Run focused tests, then the full suite.
7. Explain assumptions, rejected suggestions, and trade-offs.

## Expected starter condition

The starter builds and runs, but behavioral tests fail because:

- `SAVE10` incorrectly discounts shipping.
- `BULK5` is absent.
- quantity validation and explicit money rounding are incomplete.

The answer is intentionally present on `main` because this is an open-source learning repository. Use the generated worktree and avoid reading the completed implementation during a timed attempt.
