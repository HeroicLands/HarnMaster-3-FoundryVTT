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
- **Labels** — _"what is this about?"_ Categorization only, chosen **only** from the organisation's label set (§3). Never invent a label.
- **Milestone** — _"which capability gate does this advance?"_ At most one, from a curated set (§4).

Keep the roles separate: do not encode priority, urgency, or work-shape as a
label; do not encode subject matter as a type.

## 1. Issue types

Exactly **one** type per issue. Do not leave an issue untyped.

Issue types are **organization-level** in the `HeroicLands` org, so the same five
types — and their definitions — are shared with every repository in the project.
They are not redefined here.

| Type        | Use it when…                                                                                                                             |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **bug**     | Existing, shipped behavior is wrong or broken — an error, crash, incorrect result, or regression.                                        |
| **feature** | A new capability or enhancement that does not exist yet, deliverable as one shippable unit of value.                                     |
| **epic**    | A large body of work that only makes sense decomposed into sub-issues; a coordinating container tracked by its children.                 |
| **task**    | Necessary work that is neither a defect nor a new capability: chores, maintenance, refactors, dependency bumps, tooling, docs, releases. |
| **spike**   | A **timeboxed** investigation whose deliverable is a decision or recommendation — not shipped code.                                      |

**Type rules**

- **MUST** assign exactly one type.
- A **bug** is _broken_; a **feature** is _missing_. That distinction resolves most ambiguity — decide which word fits before anything else.
- An **epic** MUST link its sub-issues and SHOULD carry little implementation detail of its own.
- A **spike** MUST state the question it answers and its timebox. It typically _spawns_ follow-up issues rather than doing the work.
- A **refactor** that changes no external behavior is a **task**, labelled `flag/tech-debt`.

**What "broken" means here.** This repository ships running code _and_ game data,
so a bug is either: behavior that misfires (a roll that applies the wrong
modifier, a sheet that will not open, an active effect silently ignored), or a
compendium document whose data is wrong in a way the rules can detect. A rule
that was never implemented is not broken — that is a **feature**.

> Bug and enhancement are issue **types**, never labels.

## 2. Priority (GitHub issue field)

Priority is a native **Priority** field on the issue — an organization-level
issue field, **not** a label. One value per issue, from: **Urgent · High ·
Medium · Low**.

Priority is about attention, not schedule — this project has no deadlines, so it
answers "when I next sit down, what deserves my time?"

| Priority   | Meaning                                            | Typical triggers                                                                       |
| ---------- | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Urgent** | Do it next session. Active harm or a hard blocker. | World data loss or corruption; the system fails to load; a release cannot be cut.      |
| **High**   | Wanted soon.                                       | A core play loop is unusable with no workaround; work the active milestone depends on. |
| **Medium** | **Default.** Should get done; not blocking.        | Most fixes and features; defects with a workaround.                                    |
| **Low**    | Deferrable indefinitely with little cost.          | Cosmetic issues; nice-to-haves; long-tail edge cases.                                  |

**Priority rules**

- **MUST** set a priority on every issue.
- **Default to Medium.** Anything higher MUST be justified in the body in one line. Do not inflate.
- Priority is independent of type, labels and milestone. A `flag/security` label is **not** automatically Urgent — judge impact, not topic.

## 3. Labels

Labels are defined once for the whole organisation, in `labels.yml` of the
`HeroicLands/.github` repository. This repository keeps no registry of its own,
and does not create labels; a label that does not exist there is not applied.
If none fits, note the gap in the issue body for a maintainer to decide.

| Group         | Labels                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `type/`       | `type/bug`, `type/feature`, `type/epic`, `type/task`, `type/spike` — exactly one per issue                                   |
| `area/`       | `area/documentation`, `area/devops`, `area/tests`, `area/content`, `area/system`, `area/site`, `area/layout`, `area/styling` |
| `flag/`       | `flag/breaking-change`, `flag/security`, `flag/regression`, `flag/tech-debt`                                                 |
| `status/`     | `status/blocked`, `status/question`                                                                                          |
| `resolution/` | `resolution/duplicate`, `resolution/wontfix`                                                                                 |
| `ci/`         | `ci/e2e`                                                                                                                     |

**When to use them here**

- `area/content` — the shipped compendium content: items, characters, journals, and their data.
- `area/styling` — presentation only; does not affect function or a rules outcome.
- `area/devops` — build, tooling, pack pipeline, release, repository configuration.
- `area/documentation` — README, process and authoring guides.
- `flag/breaking-change` — alters a document ID, the data model, or pack compatibility in a way existing worlds notice.
- `flag/security` — touches an attack surface: client script execution, world-data integrity, privilege escalation.
- `ci/e2e` — on a pull request, runs the full Foundry end-to-end suite.
- There is deliberately no use of `area/system`: almost every issue here is about the system code, so the label would carry no information.

**Label rules**

- Labels are additive and orthogonal — `area/content` + `area/devops` + `flag/regression` on one bug is fine.
- Do not use a label to express something a type, the priority field, or a milestone already expresses.
- Progress toward a capability is tracked by **milestones** (§4), not labels.

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
| --------------------------------- | -------------------------------------------------------------------------- |
| `HarnMaster-3-FoundryVTT`         | **This repository** — the `hm3` system: code, templates, styles, its packs |
| `Song-of-Heroic-Lands-FoundryVTT` | The `sohl` system — a separate game system, not a version of this one      |
| `sohl-kethira-basic`              | The `kethira` package — Hârn content for `sohl`, not for `hm3`             |
| `package-build`                   | The shared build toolchain this repository consumes                        |
| `heroiclands-site`                | heroiclands.org — its content, hosting, and CDN                            |

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
