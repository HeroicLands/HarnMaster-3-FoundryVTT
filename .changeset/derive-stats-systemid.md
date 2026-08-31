---
"hm3": patch
---

Stop authoring `stats.systemId`; it is derived.

package-build 7.0.0 refuses `stats.systemId` and `stats.systemVersion`:
authoring a derived value is an error rather than an override, because a
transcribed copy is free to drift from what it copied — which is how
`stats.systemVersion` came to sit at `0.6.0` for four releases
(HeroicLands/package-build#48).

Here a system package is its own system, so `hm3` is derived from `foundryPackage`, so deleting the line changes nothing:

```diff
 stats:
-    systemId: hm3
     lastModifiedBy: …
```

**Verified.** Every pack in this package stamps exactly the `systemId` and
`systemVersion` it stamped before — resolved with the configuration loader
and compared pack by pack.
