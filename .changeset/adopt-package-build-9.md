---
"hm3": patch
---

Adopt `@heroiclands/package-build` 9.0.0 and format the tree.

The shared `printWidth` moves from 80 to 100. This repository had never been
formatted at all — issue #434 recorded the backlog as "110 unformatted files of
145", and the CI comment explains why `lint:format` was left out of the build:
a gate that cannot go green teaches everyone to merge past a red check.

It can go green now. **103 files formatted**, and `content-build format` and a
raw `prettier --check` both report the tree clean.

**Two things had to be fixed for that to be true.**

**A Prettier config file.** There wasn't one. `content-build format` applies the
shared options directly, so the lint chain was correct — but Prettier's editor
integrations and a bare `npx prettier` resolve a config _file_, and fall back to
Prettier's own defaults when they find none. That meant format-on-save was
quietly rewriting this repository at `printWidth: 80` and `tabWidth: 2` against a
project that uses 100 and 4. `prettier.config.js` now re-exports the shared
configuration, so every route resolves the same options.

**Nine templates Prettier cannot parse.** They put a Handlebars block helper in
attribute position:

```html
<input type="text" … {{#if idata.skillBase.formula}}readonly{{/if}} />
```

Prettier's HTML parser reports `Opening tag "input" not terminated` and formats
nothing. The markup is correct Handlebars and Foundry renders it — this is a
parser limitation, not a defect. Those nine are listed in `.prettierignore` with
the exact criterion recorded, deliberately _not_ as `templates/`: every other
template parses, and excluding the directory would stop checking forty files
that are fine. The note there also says what the fix is never to be — removing a
conditional attribute to please the formatter.

**Verification.** 138 tests pass; `content-build format` reports clean over 145
files; `prettier --check .` reports clean.

**Bump**

_Patch._ Whitespace, one config file, and nine ignore entries. No behaviour, no
emitted document, no manifest change.
