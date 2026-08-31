`README.md` addresses this repository as `toastygm/HarnMaster-3-FoundryVTT` in six places, while `package.json`, the generated `system.json` and every release address say `HeroicLands/HarnMaster-3-FoundryVTT`.

The badges are the visible half:

```
![GitHub release (latest by date)](https://img.shields.io/github/v/release/toastygm/HarnMaster-3-FoundryVTT)
![GitHub issues](https://img.shields.io/github/issues-raw/toastygm/HarnMaster-3-FoundryVTT)
![GitHub downloads (latest)](…/repos/toastygm/HarnMaster-3-FoundryVTT/releases/latest…)
```

## Why it matters more than a stale link

**`README.md` ships.** `packageBuild.assets` stages it into the module, so it is inside the distributed system, not merely on the GitHub page.

**The badges are live queries against the wrong repository.** They resolve against whatever `toastygm/HarnMaster-3-FoundryVTT` is today, so a reader sees a release number, an issue count and a download total that describe a different repository — or a broken badge, silently, if it moves or goes private. Either way the numbers are not this system's, and nothing here would report that they had stopped being.

**It points contributors at the wrong issue tracker.** Someone reading the shipped README to report a bug files it where nobody is looking.

Found while adopting `@heroiclands/package-build@5.0.0` (#421). The homepage authored there deliberately uses the `HeroicLands` addresses — the ones the generated manifest actually emits — so the README is now the only place carrying the old ones.

## Fix

Repoint all six references at `HeroicLands/HarnMaster-3-FoundryVTT`, and check the same file's non-GitHub links while there: it cites an "official documentation" site and a modules list, either of which may have moved with the repository.

Worth a wider grep than `README.md` alone — `WALKTHROUGH.md` also ships, and `CONTRIBUTING.md` / `.github/` are contributor-facing.

## Acceptance criteria

- No shipped or contributor-facing file addresses this repository as `toastygm/…`.
- Every badge resolves against `HeroicLands/HarnMaster-3-FoundryVTT` and renders a number that describes this repository.
- Links to documentation and to the issue tracker point where the work actually happens.
