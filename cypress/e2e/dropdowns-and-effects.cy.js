/**
 * Dropdowns render with a selection, and active effects can be created.
 *
 * Two more things the v14 work could only be reasoned about:
 *
 *  - `{{#select}}` was removed in v14. All 35 blocks were rewritten, 22 onto
 *    `{{selectOptions}}` and 13 onto an explicit `selected` attribute. A
 *    mistake in either shows up as a dropdown that renders but forgets its
 *    value.
 *  - ActiveEffect renamed `label`/`icon` to `name`/`img` in v11, with no
 *    migration left in v14 and `name` required and non-blank — so creating an
 *    effect failed validation outright.
 *
 * Test plan: Part 2.4 (editing items), Part 9.1 (create and apply effects).
 */
describe("dropdowns", () => {
    before(() => cy.login());
    afterEach(() => cy.closeAllSheets());
    after(() => cy.cleanupByPrefix("E2E "));

    /**
     * Open an item's sheet and return its select elements.
     *
     * @param {string} type - Item subtype.
     * @param {object} system - System data to set.
     */
    const withItemSheet = (type, system = {}) =>
        cy.createDocument("Item", { name: `E2E ${type} dropdown`, type, system }).then((item) =>
            cy.window().then(async () => {
                await item.sheet.render(true);
                return item;
            }),
        );

    it("renders a skill's type dropdown with the stored value selected", () => {
        withItemSheet("skill", { type: "Combat" }).then((item) => {
            const select = item.sheet.element.querySelector('select[name="system.type"]');
            expect(select, "type select").to.exist;
            expect(select.options.length, "has options").to.be.greaterThan(1);
            expect(select.value, "keeps its stored value").to.equal("Combat");
        });
    });

    it("renders a trait's type dropdown with the stored value selected", () => {
        withItemSheet("trait", { type: "Psyche" }).then((item) => {
            const select = item.sheet.element.querySelector('select[name="system.type"]');
            expect(select.value).to.equal("Psyche");
        });
    });

    it("renders the missile weapon aspect dropdown from the config list", () => {
        // This one stopped being a hand-maintained copy of three <option> tags
        // and became `HM3.allowedAspects`.
        withItemSheet("missilegear", { weaponAspect: "Blunt" }).then((item) => {
            const select = item.sheet.element.querySelector('select[name="system.weaponAspect"]');
            expect(select.value).to.equal("Blunt");
            const values = [...select.options].map((o) => o.value);
            expect(values).to.have.members(["Edged", "Piercing", "Blunt"]);
        });
    });

    it("renders armour location effective-impact dropdowns", () => {
        // Five `{{#select}}` blocks in one template, all converted at once.
        withItemSheet("armorlocation", {}).then((item) => {
            const el = item.sheet.element;
            for (const [field, expected] of Object.entries({
                ei1: "M1",
                ei5: "S2",
                ei9: "S3",
                ei13: "G4",
                ei17: "G5",
            })) {
                const select = el.querySelector(`select[name="system.effectiveImpact.${field}"]`);
                expect(select, `${field} select`).to.exist;
                expect(select.value, `${field} default`).to.equal(expected);
            }
        });
    });

    it("keeps a changed dropdown value after the sheet re-renders", () => {
        withItemSheet("skill", { type: "Craft" }).then((item) => {
            return cy.window().then(async (win) => {
                await item.update(win.JSON.parse(JSON.stringify({ "system.type": "Physical" })));
                await item.sheet.render(true);
                const select = item.sheet.element.querySelector('select[name="system.type"]');
                expect(select.value).to.equal("Physical");
            });
        });
    });
});

describe("active effects", () => {
    before(() => cy.login());
    afterEach(() => cy.closeAllSheets());
    after(() => cy.cleanupByPrefix("E2E "));

    it("creates an effect on an actor", () => {
        // `label`/`icon` would fail validation here: `name` is required and may
        // not be blank, and v14 keeps no migration from the old keys.
        cy.hm3Actor("Sir Baris").then((actor) =>
            cy
                .createDocument(
                    "ActiveEffect",
                    { name: "E2E Test Effect", img: "icons/svg/aura.svg", origin: actor.uuid },
                    { parent: actor },
                )
                .then((effect) => {
                    expect(effect, "created effect").to.exist;
                    expect(effect.name).to.equal("E2E Test Effect");
                    return cy.window().then(() => effect.delete());
                }),
        );
    });

    it("opens the HM3 effect config, offering the system's key list", () => {
        cy.hm3Actor("Sir Baris").then((actor) =>
            cy
                .createDocument(
                    "ActiveEffect",
                    {
                        name: "E2E Keyed Effect",
                        img: "icons/svg/aura.svg",
                        changes: [{ key: "system.eph.meleeAMLMod", mode: 2, value: "10" }],
                    },
                    { parent: actor },
                )
                .then((effect) =>
                    cy.window().then(async () => {
                        expect(effect.sheet.constructor.name, "HM3's config, not core's").to.equal(
                            "HM3ActiveEffectConfig",
                        );
                        await effect.sheet.render(true);
                        return { effect, sheet: effect.sheet };
                    }),
                )
                .then(({ effect, sheet }) => {
                    // The curated key list is supplied by giving the schema field
                    // its `choices`, so core's own template renders a <select>.
                    const select = sheet.element.querySelector('select[name*="changes.0.key"]');
                    expect(select, "key rendered as a dropdown").to.exist;
                    const values = [...select.options].map((o) => o.value);
                    expect(values).to.include("system.eph.meleeAMLMod");
                    return cy.window().then(async () => {
                        await sheet.close();
                        await effect.delete();
                    });
                }),
        );
    });
});
