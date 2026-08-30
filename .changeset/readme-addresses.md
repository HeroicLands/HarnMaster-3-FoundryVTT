---
"hm3": patch
---

Fixed: the README addresses this repository by its current name, and its two
broken links work again.

`README.md` is staged into the system by `packageBuild.assets` and ships inside
the released `system.zip` — it is installed alongside the code, not merely
displayed on a GitHub page. So the addresses it carries are ones players read
after installing, and the manifest's `readme: README.md` names it.

**What was stale.** Six references still said `toastygm/…`, the owner this
repository had before it moved; `package.json`, the generated `system.json` and
every release address have said `HeroicLands/…` since the build was modernised.
GitHub redirects a renamed owner, so most of them still resolved — which is
precisely why nobody noticed. They are repointed anyway. The redirect survives
only until someone claims the vacated name, and three of the six are live
queries: a release badge, an issue-count badge, and a downloads badge, each of
which would then begin reporting a different repository's numbers without
anything here failing.

**What was broken.** Two were not merely stale.

The _Downloads@latest_ badge rendered the text `query not supported`, for either
owner. It was a `shields.io/badge/dynamic/json` badge whose JSONPath filter
expression — `assets[?(@.name.includes('zip'))].download_count` — shields.io no
longer accepts. It is now the built-in
`shields.io/github/downloads/<owner>/<repo>/latest/total` endpoint, which
renders the count and drops the hand-rolled `api.github.com` request that badge
was making.

The link offered as the "official documentation" pointed at
`toastygm.github.io/HarnMaster-3-FoundryVTT`, a GitHub Pages site that no longer
exists and returns 404 — there is no equivalent under the new owner either. It
now points at `https://www.heroiclands.org/hm3/`, the homepage this repository
publishes, and the section that held it is headed _Documentation_ rather than
_Pages Site_.

The two wiki links and the release badge simply changed owner; both wiki pages
exist under the new one. Nothing else in the repository named the old owner,
and the single remaining mention — in the `modernise-the-build` changeset,
recording that the manifest addresses were repointed — is a true statement about
the past and is left alone.

Closes #423.
