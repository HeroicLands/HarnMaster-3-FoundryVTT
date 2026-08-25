---
"hm3": minor
---

Build and release the system with `@heroiclands/package-build`, on the same
rails as every other HeroicLands Foundry package.

`system.json` is now generated rather than hand-maintained, which repoints the
manifest, download, url and bugs addresses from `toastygm/` to `HeroicLands/` —
the repository moved and they had not. Per-pack `ownership` is no longer
declared, so Foundry's defaults apply.

The compendium packs are unchanged: 674 documents across the same four packs,
still authored as JSON under `packs/<name>/_source/`, now compiled into the
build stage instead of in place.

Internally: the 2019 gulp/node-sass build is replaced by Dart Sass (it could no
longer install at all on any current Node), pull requests are gated by CI for
the first time, and releases are cut by changesets rather than by hand.
