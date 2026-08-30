---
"hm3": patch
---

Fixed: the compendium source round trips again, and a check now says so.

`CONTRIBUTING.md` tells a contributor that extracting the built packs back to
`assets/packs/` produces no diff, "so anything `git diff` shows is a change you
made". That is what makes the edit-in-Foundry loop usable at all — it is the
difference between reviewing your own edit and reading 1,597 JSON files. It had
stopped being true: a round trip with no edit whatsoever rewrote 56 documents
under different names, 112 changed paths in `git status`, and any real edit was
buried in the noise.

Two separate mistakes, both filenames only. **55 folder documents** were
committed with a `folder_` prefix — `folder_Agrik_jOppWJPOPMwgDYFG.json` — which
is `@heroiclands/package-build`'s convention for the folder JSON it generates
from a Markdown content tree. This system has no such tree and does not use that
pipeline; it extracts with `extractPack` from `@foundryvtt/foundryvtt-cli`, which
names every document `<name>_<id>.json` whatever its type and has never emitted
that prefix. The names came in with the pack consolidation and disagreed with the
extractor from that day on. **One item document** was worse than misnamed:
`Pence` was committed as `Pence_TV3IMHs8SLZ1L1vv.json`, and
`TV3IMHs8SLZ1L1vv` is not its id — it is the id of the `Cash` folder the item
sits in. Its own id is `sR0MNABSDrVxUQMf`. Both are now named the way the
extractor names them, and 26 of the folder files also regained the trailing
newline it writes.

**Nothing that ships changed.** The renames are of source files only; the
compiled LevelDB is byte-identical, document for document. Every `_id` is
untouched, so every `Compendium.hm3.items.Item.<id>` UUID still resolves, and the
packs still compile the same 1,577 items and 20 system-help journals. No code in
this repository ever read the `folder_` prefix.

`npm run lint:roundtrip` now checks the property rather than restating it. It
extracts what `build:compiledb` has just written into a scratch directory under
`build/` and compares that tree byte for byte with `assets/packs/`, so a file
under an unexpected name, a file whose bytes differ, and a document present on
only one side are all one failure with one remedy — run `npm run build:unpackdb`
and commit the result. It reimplements none of the extractor's naming rules,
deliberately: the convention belongs to the CLI, is not exported, and a copy of
it here would drift the first time the CLI changed. It runs inside `build:noci`,
right after `build:compiledb`, which is where its input exists.
