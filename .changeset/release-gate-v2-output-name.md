---
"hm3": patch
---

Read the changesets output that `changesets/action@v2` actually sets, so the
release gate can evaluate.

`release.yml` pins `changesets/action@v2` but gated on
`steps.changesets.outputs.hasChangesets` — a **v1** output name. v2 renamed
every output to kebab-case (`hasChangesets` → `has-changesets`,
`pullRequestNumber` → `pr-number`, `publishedPackages` → `published-packages`),
and a v1 name read against a v2 action resolves to the empty string. The gate
was therefore `'' == 'false'`, which is false on every run: _Decide whether to
release_ and every step below it were skipped unconditionally, so no release
could ever be cut — while the job reported green.

**Nothing this system ships changes.** The correction is one expression in one
workflow, now `steps.changesets.outputs['has-changesets'] == 'false'`, matching
the four sibling HeroicLands release workflows that already read the v2 name.
The audit behind it is the whole file: this was the only reference in the
repository to an output of a third-party action, and the only stale spelling.
Every other `steps.<id>.outputs.*` reference resolves to `decide`'s own
`release` and `tag`, written by the inline script one step above.

The tag-existence half of the gate — which is what keeps an ordinary push, or a
re-run, from cutting the same release twice, and what makes the hand-cut tags up
to `v1.6.3` safe to inherit — is unchanged and needs no correction. It is
byte-identical to the guard that has already run in a sibling repository under
the v1 name, taking both of its branches: cutting three releases, and reporting
_"Tag v0.8.2 already exists — nothing to release"_ on four subsequent pushes.

Closes #427.
