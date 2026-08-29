---
"hm3": patch
---

Take `@heroiclands/package-build` 5.0.0, and author the package homepage it
introduces.

**Nothing this system ships changes.** The build stages the same 540 files, and
538 of them are byte-identical to what 4.0.0 produced — the two that differ are
the LevelDB `LOG` files, which carry wall-clock timestamps and differ between
two runs of the _same_ version. `system.json` is byte-identical, and the packs
compile the same 1,577 items and 20 system-help journals.

**`publish.site` is a mode now, not a boolean** — `homepage` or `content`, with
both booleans refused at config load rather than mapped onto the nearest one.
This repository declared no `publish:` section, so nothing was refused here and
the new default, `homepage`, already applied. It is now written out, because a
mode inherited by omission reads to the next person as a question nobody asked.

**The homepage is a page, authored rather than assembled.** 5.0.0 adds a
`type: homepage` note that compiles to a page instead of to a compendium
document, published at `/hm3/`. It says what the system is, the manifest URL to
paste into Foundry, that Foundry 14 or later is needed, that you still need your
own copy of the HârnMaster rules, and where the source and the licence are.
Everything on it is drawn from `README.md`, `WALKTHROUGH.md` and the manifest;
only the title is derived, and here it is authored so the page can greet a
reader as HârnMaster rather than as the manifest's `HarnMaster 3`.

Two pieces of plumbing came with it, both new to this repository:

- `assets/content/` now exists, with the homepage note as its only file. HM3
  uses only the packaging half of the toolchain — its compendium content is
  committed JSON under `assets/packs/` — so this is not a content tree and the
  site build walks it for exactly one thing.
- `npm run build:site` wires `content-build site`, which nothing here invoked
  before. It emits one file, `site/content/_index.md`, and that tree is a build
  artifact and gitignored. `site.out` is required rather than defaulted: the
  output directory is wiped on every run, and an unset value would resolve to
  the repository root, so the build refuses it.
