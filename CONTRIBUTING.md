# Contributing to the HârnMaster 3 system

This repository ships the `hm3` **Foundry VTT game system** — the code Foundry
loads, its Handlebars templates and styles, its localization, and four
compendium packs of game content.

It is an unofficial implementation of HârnMaster 3, a game by Columbia Games,
Inc. Game mechanics may be implemented; the creative expression used to describe
them in the published books is not ours to reproduce.

## Filing an issue

**This repository tracks its own work.** Every issue is classified on four
axes — **type**, **priority**, **labels**, **milestone** — defined in the
[Issue Reporting standard](.github/ISSUE_REPORTING.md).

- [Open an issue](https://github.com/HeroicLands/HarnMaster-3-FoundryVTT/issues/new)
- [Issue Reporting standard](.github/ISSUE_REPORTING.md)

Exploitable weaknesses go to a **private advisory**, never a public issue — see
[SECURITY.md](SECURITY.md).

## Making a change

`main` is protected: it takes no direct pushes, and merges are squash-only.
Every change lands through a pull request.

1. **Find or file the tracking issue.** Pure housekeeping (`chore/*`) may skip
   this; anything else gets an issue first, so you have its number for the
   branch.
2. **Branch off current `main`**, named `<type>/<issue_#>_<short-kebab-summary>`
   — e.g. `feat/308_automatic-blind-rolls`, `bug/327_active-effects-attack-ml`.
   Issue-free housekeeping is `chore/<slug>`.
3. **Make the change**, keeping it small and focused.
4. **Declare the release.** Add a changeset — `npm run changeset` — saying
   whether this is a `patch`, `minor` or `major` and what changed. Write it for
   someone reading the release notes, not for the reviewer. A change that adds
   none ships nothing, because the release is versioned from changesets.
5. **Verify it.** `npm run build:local` must pass. It compiles the styles,
   stages the assets, builds all four compendium packs and generates
   `system.json`, so a failure means the system would not load.
6. **Commit** in Conventional-Commits style, and **open a pull request** with
   `Closes #<n>` and a what/why description.

**No AI/assistant attribution** in commit messages, pull-request titles or
bodies, or issues — no `Co-Authored-By:` trailer naming an assistant, and no
"Generated with Claude Code"-style signature. A committed `commit-msg` hook
(activated by `npm install`) rejects such commits locally, and the **No
Attribution** check fails any pull request carrying it.

## Working on the compendium packs

The packs are **committed JSON**, one file per document, under
`assets/packs/<name>/`. There is no Markdown content tree in this repository.

The comfortable loop is to edit inside Foundry and extract the result:

```bash
npm run build:local      # build everything into build/stage/
npm run deploy:dev       # install that into your Foundry data directory
#   ... edit the compendium in Foundry, then:
npm run build:unpackdb   # extract the packs back to assets/packs/*/
git diff                 # review what actually changed
```

Round-tripping without editing produces no diff, so anything `git diff` shows is
a change you made. Editing the JSON by hand is equally valid for small fixes.

**Never commit the compiled packs.** The LevelDB directories Foundry actually
reads are build output: `build:compiledb` writes them into `build/stage/packs/`,
which is not tracked. Only the JSON under `assets/packs/<name>/` belongs in
git. `npm run lint:packs` enforces this and CI runs it, so a pull request adding
`.ldb` files fails — if you find yourself wanting to commit them, the build step
you are looking for is `npm run build:local`.

## Running the system locally

**The loadable system is `build/stage/`, not the repository root.** `system.json`
is generated, the styles are compiled, and the packs are built — none of those
exist in the checkout. Point Foundry at the stage, or use `npm run deploy:dev`,
which installs it into the data directory named by `HM3_*`/`FOUNDRYVTT_DEV_DATA`.

## Releasing

Nobody cuts a release by hand. Merging a pull request that carries a changeset
opens (or updates) a **Version Packages** pull request; merging *that* builds
the system, tags `v<version>`, and publishes the GitHub Release with
`system.zip` and `system.json` attached.
