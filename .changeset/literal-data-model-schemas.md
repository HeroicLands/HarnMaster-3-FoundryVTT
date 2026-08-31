---
"hm3": patch
---

Write the data model schemas out as literals, so they can be read as data.

`package-build schema` publishes a system's `system` field sets by reading
`defineSchema()` from source — a DataModel's schema is only introspectable
inside Foundry, so a content build that wants to know what a document will
actually receive has to read the declaration rather than run it. Foundry
discards an unknown `system` key at construction and says nothing about it, and
that check is what catches it.

The reader follows declarations, not calls. Two places here were built by a
function instead of written out, and each read back as less than it is:

- **`skillBase: skillBaseField()`** recorded `skillBase` with no keys beneath
  it, while authored content writes `skillBase.value` on 54,744 embedded skills
  and `skillBase.formula` on psionics. Those correctly authored fields would
  have been reported as undeclared.
- **`abilities: new SchemaField(Object.fromEntries(ABILITIES.map(…)))`**
  recorded `abilities` alone. That is enough to stop `abilities.strength.base`
  being called undeclared — a declared ancestor covers what lies under it — but
  it means the schema never described the ability set at all, so a _misspelt_
  ability could not be caught. Written out, all 27 ability paths are declared,
  and a name that is not one of the thirteen is a finding rather than a silent
  discard.

Nothing about the model changes: the same thirteen abilities under the same
names, and the same three `skillBase` fields. This is what the declaration
always meant, spelled so that something other than Foundry can read it.

**Why not teach the reader to follow a factory.** It was tried, and it recovers
the `skillBase` case but not the `abilities` one — no reader recovers keys that
are computed at runtime. So the schema would still have been silent about the
ability set, which is the half that matters here: 2,512 notes author fourteen
ability keys each, and one of them (`end`) corresponds to no field in this
model at all. Writing the abilities out is what makes that visible.

**Bump**

_Patch._ A refactor with no change to the emitted schema, the stored data, or
any behaviour. Only the way the declaration is spelled.
