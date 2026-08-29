# Issue Reporting — HarnMaster-3-FoundryVTT

This document defines how issues are created and classified in the **`hm3`**
repository, which ships the HârnMaster 3 **game system** for Foundry VTT: the
code Foundry loads, its templates, styles and localization, and its compendium
packs.

**This repository is its own tracker.** File HM3 work here. See §7 for where a
given piece of work belongs.

The core discipline is four axes, each answering a different question:

- **Type** — _"what shape of work is this?"_ One per issue, from a closed set of five.
- **Priority** — _"how soon and how badly does this need doing?"_ A GitHub issue field, one value, defaults to Medium.
- **Labels** — _"what is this about?"_ Categorization only, chosen **only** from the registry in §3. Never invent a label.
- **Milestone** — _"which capability gate does this advance?"_ At most one, from a curated set (§4).

Keep the roles separate: do not encode priority, urgency, or work-shape as a
label; do not encode subject matter as a type.

## 1. Issue types

Exactly **one** type per issue. Do not leave an issue untyped.

Issue types are **organization-level** in the `HeroicLands` org, so the same five
types — and their definitions — are shared with every repository in the project.
They are not redefined here.

| Type        | Use it when…                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **bug**     | Existing, shipped behavior is wrong or broken — an error, crash, incorrect result, or regression.                                                                  |
| **feature** | A new capability or enhancement that does not exist yet, deliverable as one shippable unit of value.                                                               |
| **epic**    | A large body of work that only makes sense decomposed into sub-issues; a coordinating container tracked by its children.                                           |
| **task**    | Necessary work that is neither a defect nor a new capability: chores, maintenance, refactors, dependency bumps, tooling, docs, releases.                           |
| **spike**   | A **timeboxed** investigation whose deliverable is a decision or recommendation — not shipped code.                                                                |

**Type rules**

- **MUST** assign exactly one type.
- A **bug** is _broken_; a **feature** is _missing_. That distinction resolves most ambiguity — decide which word fits before anything else.
- An **epic** MUST link its sub-issues and SHOULD carry little implementation detail of its own.
- A **spike** MUST state the question it answers and its timebox. It typically _spawns_ follow-up issues rather than doing the work.
- A **refactor** that changes no external behavior is a **task**, labelled `tech-debt`.

**What "broken" means here.** This repository ships running code *and* game data,
so a bug is either: behavior that misfires (a roll that applies the wrong
modifier, a sheet that will not open, an active effect silently ignored), or a
compendium document whose data is wrong in a way the rules can detect. A rule
that was never implemented is not broken — that is a **feature**.

> `bug` and `enhancement` were used as *labels* in this repository until 2026-08.
> They are the **type** axis now. Every issue that carried one had its type set
> from it before the labels were retired; do not reintroduce them.

## 2. Priority (GitHub issue field)

Priority is a native **Priority** field on the issue — an organization-level
issue field, **not** a label. One value per issue, from: **Urgent · High ·
Medium · Low**.

Priority is about attention, not schedule — this project has no deadlines, so it
answers "when I next sit down, what deserves my time?"

| Priority   | Meaning                                                     | Typical triggers                                                                              |
| ---------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Urgent** | Do it next session. Active harm or a hard blocker.          | World data loss or corruption; the system fails to load; a release cannot be cut.             |
| **High**   | Wanted soon.                                                | A core play loop is unusable with no workaround; work the active milestone depends on.        |
| **Medium** | **Default.** Should get done; not blocking.                 | Most fixes and features; defects with a workaround.                                            |
| **Low**    | Deferrable indefinitely with little cost.                   | Cosmetic issues; nice-to-haves; long-tail edge cases.                                          |

**Priority rules**

- **MUST** set a priority on every issue.
- **Default to Medium.** Anything higher MUST be justified in the body in one line. Do not inflate.
- Priority is independent of type, labels and milestone. A `security` label is **not** automatically Urgent — judge impact, not topic.

## 3. Labels — the closed registry

Labels are for **categorization only**. The table below is the complete,
authoritative set for this repository. Its machine-readable twin is
[`.github/labels.yml`](labels.yml), which the `labels-sync` workflow reconciles
onto GitHub. The set is **closed** — a label not in the registry is deleted on
sync, from the repository and from every issue carrying it.

> **MUST NOT invent, rename, or improvise labels.** If no existing label fits,
> add none and note the gap in the body. Extending the registry is a deliberate
> edit to **both** this table and `.github/labels.yml`.

| Label              | Scope                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `compendium`       | The shipped compendium content — items, characters, journals, and their data.                  |
| `cosmetic`         | Presentation only; does not affect function or a rules outcome.                                |
| `regression`       | Something that previously worked and stopped. Pairs with type `bug`.                           |
| `devops`           | Build, tooling, pack pipeline, release, repository configuration.                              |
| `security`         | Touches an attack surface: client script execution, world-data integrity, privilege escalation. |
| `tech-debt`        | Restructuring or cleanup of working code; refactors.                                           |
| `breaking-change`  | Alters a document ID, the data model, or pack compatibility in a way existing worlds notice.    |
| `blocked`          | Cannot proceed until an external dependency or another issue clears.                           |
| `documentation`    | Documentation about this repository — README, process, authoring guides.                       |
| `duplicate`        | This issue or pull request already exists.                                                     |
| `question`         | Further information is requested.                                                              |
| `wontfix`          | This will not be worked on.                                                                    |
| `good first issue` | Small, well-bounded, and a reasonable place for a new contributor to start.                    |
| `help wanted`      | Extra attention is needed.                                                                     |

There is deliberately no `system` or `code` label: almost every issue here is
about the system code, so the label would carry no information.

## 4. Milestones — capability gates

Milestones are **capability gates, not calendar dates** — a demonstrable
threshold the system crosses, phrased as a state ("automated combat is
trustworthy"), not a date or a bare version number. Leave due dates blank.

- You MAY assign a milestone when the work **unambiguously advances exactly one existing gate**.
- Leave it **unset** when the issue advances none, spans several, or the mapping is unclear. Unset is a normal, correct state.
- You MUST NOT invent a milestone. If none fits and one seems warranted, say so in the body.

The one milestone this repository carries, `Release 1.2.22`, is a leftover from
the old version-numbered scheme and is not a capability gate. Do not add to it.

## 5. Choosing the type — decision procedure

1. Is existing shipped behavior wrong? → **bug**.
2. Is the deliverable a decision rather than code, with a timebox? → **spike**.
3. Does it need multiple sub-issues to make sense? → **epic**.
4. Is it a new capability a player or GM would notice? → **feature**.
5. Otherwise → **task**.

## 6. Body structure by type

Keep bodies short and concrete. These are the fields that make an issue
actionable; omit what genuinely does not apply.

**Bug** — Summary · Steps to reproduce · Expected vs. actual · Environment
(Foundry version, system version, other active modules) · Notes.
For this system, the browser console output is usually the most valuable single
thing you can include.

**Feature** — Problem / motivation · Proposed solution · Acceptance criteria.

**Task** — What and why · Acceptance criteria.

**Spike** — The question · The timebox · What a good answer looks like.

**Epic** — Goal · Sub-issues (linked) · What "done" means for the whole.

## 7. Which repository does an issue belong in?

The project spans several repositories in the `HeroicLands` organization, and
**each one tracks its own work.** There is no central tracker.

| Repository                        | Tracks                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `HarnMaster-3-FoundryVTT`         | **This repository** — the `hm3` system: code, templates, styles, its packs  |
| `Song-of-Heroic-Lands-FoundryVTT` | The `sohl` system — a separate game system, not a version of this one       |
| `sohl-kethira-basic`              | The `kethira` package — Hârn content for `sohl`, not for `hm3`              |
| `package-build`                   | The shared build toolchain this repository consumes                          |
| `heroiclands-site`                | heroiclands.org — its content, hosting, and CDN                              |

**File the issue where the work will be done.** The rule is delivery, not
subject: if the fix is an edit to a file in this repository, the issue belongs
here, even when the symptom shows up elsewhere. A build failure caused by
`@heroiclands/package-build` is a `package-build` issue; the same build failing
because this repository's configuration is wrong is an issue here.

**Closing keywords do not cross repositories.** A pull request here carrying
`Closes HeroicLands/package-build#12` creates a reference but **does not close**
it. Close cross-repository issues by hand, with a link to the delivering commit
or pull request.

**Content modules are not this repository.** `hm3-cpl`, `hm3-fffv1`,
`hm-bestiary` and the rest are separate Foundry modules with their own
repositories. A problem with their content belongs to them; a problem with the
system's handling of it belongs here.

## 8. Security

Exploitable weaknesses go to a **private advisory**, never a public issue — see
[SECURITY.md](../SECURITY.md). A licensing problem is a public `bug`, not an
advisory.
