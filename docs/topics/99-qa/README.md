# 99-qa — Validation and QA

**Group purpose:** Validation records, verification plans, and test results.
Numbered 99 because QA is the LAST step — after design, synthesis, and implementation.

## What lives here
- `VALIDATION-NNNN-topic.md` — validation run against a spec (NNNN = spec sequence)
- `VERIFICATION.md` — overall verification plan (when written)

## Ordering rule
Sequence prefix: `VALIDATION-NNNN-` — linked by number to the corresponding SPEC in 00-canon/SPEC/.

## Process
- A validation file is created AFTER a spec is implemented and tested.
- It references the spec, the acceptance criteria, and records pass/fail.
