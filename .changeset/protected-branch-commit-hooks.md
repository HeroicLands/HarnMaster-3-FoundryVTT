---
---

Git now refuses a commit made while `HEAD` is on `main`. `.githooks/pre-commit`
and `.githooks/pre-merge-commit` decline it, so the mistake surfaces before the
commit exists rather than at push time, where the branch protection catches it
and the commit has to be moved. Repository tooling only — the hooks are in no
release artifact — so this declares no bump.
