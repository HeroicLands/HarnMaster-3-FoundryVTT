---
"hm3": patch
---

**This system moves to `@heroiclands/package-build@^22.2.0`.**

Nothing in the shipped Foundry system changes — the compendium packs and the
manifest come out the same. **`schema.json`** is now a release asset rather
than a file committed to the repository: a module depending on this system
still reads it from the release it pins, unchanged.
