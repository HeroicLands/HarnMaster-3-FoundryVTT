---
"hm3": patch
---

Fix three markup defects in the sheet and chat-card templates, and diagnose the
rest of #434's twelve unparseable files.

**The three defects**

`templates/chat/standard-test-card.html` and
`templates/chat/missile-attack-card.html` each carried a stray `</footer>` as
their second-to-last line. Both files already close a `<footer>` inside every
branch of the `{{#if isSuccess}}` / `{{#if isCritical}}` nest above it, so the
trailing one closes nothing. `templates/item/armorgear-sheet.html` closed a
`<legend>` with `</Legend>`.

Neither changes what a browser builds. An end tag with no matching element in
scope is a parse error the HTML5 tree-construction rules discard, and tag names
are ASCII case-insensitive, so Foundry has been rendering the intended DOM all
along. They are wrong in the source, not in the window — but they are exactly
the class of error that stops being harmless the moment markup moves, and they
were invisible because no tool in this repository had ever parsed these files.

Verified by rendering each template before and after through Handlebars across
every branch of its conditionals: the two cards emit one surplus standalone
`</footer>` before the change and none after, with every other byte identical,
and the armour sheet differs only in the case of that one closing tag. Nothing
in `module/`, `scss/`, or `cypress/` selects on `footer` or `legend`, so no
handler or rule binds to what moved. The unit suite (138 tests) and
`build:noci` — including `lint:roundtrip` — are green.

**The other nine are Prettier, not the markup**

The remaining nine files Prettier refuses all fail on the same construct: a
`{{#if}}…{{/if}}` block in **attribute position**, conditionally emitting a
bare boolean attribute.

```hbs
<option value="{{key}}" {{#if (eq key ../defaultRange)}}selected{{/if}}>
```

That is valid Handlebars and correct HTML in either branch. Prettier's `html`
parser reads the tag before Handlebars has run, sees `{{#if` where an attribute
name belongs, and reports the opening tag as unterminated; its `glimmer` parser
rejects the same source differently (_"A block may only be used inside an HTML
element or another block"_). A block helper straddling a tag boundary has no
parser in Prettier that accepts it. Confirmed minimally: the same conditional
**inside** a quoted attribute value (`class="tab {{#if a}}active{{/if}}"`)
formats without complaint, as does a bare `{{mustache}}` in attribute position.

So the diagnosis is that the nine are not defects, and the choice they present
is a real one rather than a formatting preference. Emitting the attribute from
a helper (`{{selectedIf …}}`) would make them parse, but it moves markup into
JavaScript and needs verification in a running Foundry; rewriting the
conditional into the attribute value would be wrong, since `selected=""` is
still selected. Neither belongs in a markup-fix change, so the files are left
as they are and the decision stays on #434 with the evidence attached.

The whole-tree reformat #434 also asks for is deliberately not here: ninety-odd
files of whitespace churn would bury a three-line markup fix.

Refs #434
