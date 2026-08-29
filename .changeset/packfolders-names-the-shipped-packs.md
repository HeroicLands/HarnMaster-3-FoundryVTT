---
"hm3": patch
---

Fixed: the compendium folder now names the packs the system actually ships.

`packFolders` in `package-build.config.yaml` still described the pack layout
from before the compendium was consolidated. It listed `character`,
`possessions`, `esoteric` and `system-help` — and of those four, three have not
existed since the items pack was created. The one pack it left out was `items`,
which carries 1,577 of the system's 1,597 documents.

What a user saw in Foundry's compendium browser was therefore a
`HârnMaster 3 System` folder holding one journal pack, with the entire item
compendium sitting loose beside it, and three names in the manifest that
resolved to nothing at all. The folder now names `items` and `system-help`, so
every pack it lists resolves and no pack is left outside it.

Nothing reported this. `packFolders` is emitted into `system.json` exactly as
declared, and the manifest generator never compares it against the `packs[]`
array it derives from the same file — so the two could disagree indefinitely and
the build stayed green. The declaration now carries a comment saying that, and
saying that adding or removing a pack means editing the folder by hand.

`system.json` is otherwise unchanged: the generated manifest differs from the
previous build in `packFolders` and in nothing else, key order included, and the
packs still compile the same 1,577 items and 20 system-help journals.

Four places in the repository's own prose said this system ships "four
compendium packs" — `CONTRIBUTING.md`, `.github/ISSUE_REPORTING.md`, and a
comment apiece in the build and release workflows. They now say "the compendium
packs", which stays true whatever the count becomes.
