---
"hm3": patch
---

Fixed: a weapon's associated skill could not be looked up.

`getAssocSkill` read each skill's name through `item.data.name`. Foundry removed
`Document#data` in v11, so that read has been `undefined` ever since and the
lookup threw rather than returning a skill. It now reads `item.name`.

Alongside it, the system has unit tests for the first time, and they run on
every pull request: 138 of them, covering the melee and missile combat result
tables, the utility helpers behind skill-base formulas and name generation, and
the integrity of the `CONFIG.HM3` tables the rest of the system reads.

The combat tables are the point. They are the game's actual rules — a pair of
lookups that decide every attack outcome — and until now nothing would have
noticed a wrong cell.
