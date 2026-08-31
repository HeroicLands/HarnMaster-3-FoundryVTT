---
"hm3": patch
---

Adopt package-build 7.0.0.

`stats.systemId` was removed from this repository's configuration because
7.0.0 derives it (HeroicLands/package-build#48) — but the pin was still
`^6.1.0`, where the key is merely *optional*. Under 6 the deletion resolves
to `systemId: null` beside a real `systemVersion`: a version stamped with no
id, silently, which is the "plausible lie" the upstream change exists to
prevent.

```text
under ^6.1.0, systemId deleted: { "systemId": null, "systemVersion": "0.8.2" }
```

Bumping the pin closes the window. Verified: every pack stamps exactly the
`systemId` and `systemVersion` it stamped before the deletion.
