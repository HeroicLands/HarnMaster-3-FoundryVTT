---
"hm3": minor
---

Publish this system's `system` field sets as `schema.json`.

Foundry discards an unknown `system` key when a document is constructed, and
says nothing: the value is absent at load while the build that wrote it reported
success. A content build cannot check for that on its own, because a DataModel's
schema is only introspectable inside Foundry — `defineSchema()` returns field
classes that do not exist in Node. So the system publishes the field sets as
data and builds read them, the same shape a link manifest already uses for
addresses rather than one repository reaching into another's checkout.

`package-build schema` reads `module/data/item-models.js` and
`module/data/actor-models.js` as an AST, following the registry that says which
subtypes exist rather than walking filenames. Twelve Item and three Actor
subtypes, with each subtype's own fields recorded apart from those it inherits:
a builder must not emit a field nothing declares anywhere, but it is not
expected to fill this system's own inherited machinery.

**Shipped in the archive, not merely committed.** A module that depends on this
system reads the copy `content-build deps fetch` caches from the release it
pins, so the comparison happens against the version that module targets rather
than whatever this repository's `main` holds today.

**Checked in CI.** `lint:schema` fails when the committed artifact disagrees
with what the data models would produce now. A generated file nothing checks
drifts from its generator silently, and this one is read by other repositories —
so the drift would surface there rather than here.

This is what makes the first finding possible: `harn-ensemble`'s 2,512 character
notes each authored fourteen ability keys against a model that defines thirteen,
and the fourteenth corresponded to no field at all
(HeroicLands/harn-ensemble#25).

**Bump**

_Minor._ One new file in the archive and a new check. Nothing about the system's
behaviour, data, or manifest changes.
