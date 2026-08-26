# End-to-end suite

Drives a real Foundry, in a real browser, against a disposable world. It exists
because the v14 work could otherwise only be argued for: a build passing proves
nothing about a system that used to die in its `init` hook.

It earned its place on the first run, finding two regressions that had shipped —
see `fix(v14): repair two regressions the end-to-end suite found`.

## Running it

```bash
npm run build:noci                  # build the system
npx package-build deploy test       # install it into the e2e data root
npm run e2e:seed                    # (re)create the hm3-e2e world
# start the shared Foundry container — see "One instance, many worlds" below
npx cypress run                     # or: npx cypress open
```

## One instance, many worlds

There is **one** e2e Foundry installation, shared by every HeroicLands package.
Its data root holds each system under `Data/systems/` and a world per package
under `Data/worlds/`; `FOUNDRY_WORLD` picks which one launches.

This is deliberate, and it is about licensing. Foundry signs a licence to the
**container hostname**, which Docker takes from the container name:

```
Config/license.json -> { host: "sohl-foundry-test", …, signature: … }
```

A container with a different name cannot verify that signature, and an unsigned
key is refused outright by v13+. One instance therefore means one signed
licence, rather than one licence consumed per package.

### The wrinkle

`package-build` derives the container name from the package id
(`containerName(packageId, stage)` → `hm3-foundry-test`) and sets `--hostname`
to match. That is right for packages with a licence each, and wrong for a shared
instance: it is the one thing standing between this suite and
`npm run e2e:full` / `npm run e2e:sweep` working directly.

Until the toolchain can be told the container name, start the shared instance by
hand and run Cypress against it:

```bash
docker run --detach \
  --name sohl-foundry-test --hostname sohl-foundry-test \
  --publish 30003:30000 \
  --volume "$FOUNDRYVTT_TEST_DATA:/data" \
  -e FOUNDRY_WORLD=hm3-e2e \
  felddy/foundryvtt:14
```

If it exits immediately with *"already locked by another process"*, remove the
stale lock — `docker restart` does not clear it the way the toolchain's
`container recreate` does:

```bash
rm -rf "$FOUNDRYVTT_TEST_DATA/Config/options.json.lock"
```

## What is seeded, and what is not

`cypress/fixtures/actors/` holds the four actors from Part 0 of the manual test
plan — Sir Baris, Mêgan of Geda, a Gârgún Warrior and a Treasure Chest — written
from the plan's own ability tables so a spec asserting on Endurance can be
checked against the book.

They carry **no items**. The plan builds their skills and gear by dragging from
compendiums, and those drags are themselves under test, so baking in the results
would skip the code the specs exist to exercise.

Each fixture needs a `_key` (`!actors!<id>`). `compilePack` places a record by
it, and a document without one is skipped in silence.

## Writing specs

- Build document payloads with `cy.createDocument()`. An object literal from the
  spec's realm is not a plain object to the game window, and Foundry rejects it
  with *"must be constructed with a DataModel or Object"*.
- Assert on observables the code cannot undo. The first attempt at the chat-card
  test watched `button.disabled`, which the handler sets on entry and clears on
  exit — it read as a listener that never fired, for an hour. `preventDefault()`
  is the honest signal.
- `testIsolation` is off, so a spec keeps its login across its tests. Reset world
  state, not the page; `cy.cleanupByPrefix("E2E ")` removes what a spec made.

## Coverage

Against the manual test plan: Part 0.7 (sheets open), Part 1.1 (each actor
type), Part 2.4 (editing items), Part 5.1–5.2 and Appendix A (rolls reach chat
intact), Part 9.1 (active effects).

Not yet covered: automated combat (Parts 6–7), injuries (Part 8), macros
(Part 10), the gear tab (Part 11), settings (Part 12), edge cases (Part 13) and
weapon behaviours (Part 14).
