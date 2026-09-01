/**
 * The sheets render and their tabs work, on ApplicationV2.
 *
 * Covers what the v14 conversion could only be reasoned about statically:
 * the sheets are now ApplicationV2, their templates lost the `<form>` wrapper
 * they used to be built around, `.window-content` sits between the form and the
 * sheet body where nothing sat before, and tab switching runs through AppV2's
 * `data-action="tab"` dispatcher rather than AppV1's tab controller.
 *
 * Test plan: Part 1.1 (each actor type opens), Part 0.7 (sheets open without
 * errors).
 */
describe("sheets", () => {
    before(() => cy.login());
    afterEach(() => cy.closeAllSheets());

    const cases = [
        {
            name: "Sir Baris",
            type: "character",
            tabs: [
                "facade",
                "profile",
                "skills",
                "combat",
                "esoteric",
                "inventory",
                "macro",
                "effects",
            ],
        },
        {
            name: "Gârgún Warrior",
            type: "creature",
            tabs: [
                "facade",
                "profile",
                "skills",
                "combat",
                "esoteric",
                "inventory",
                "macro",
                "effects",
            ],
        },
        { name: "Treasure Chest", type: "container", tabs: ["facade"] },
    ];

    for (const { name, type, tabs } of cases) {
        describe(`${type}: ${name}`, () => {
            it("opens as an ApplicationV2 sheet", () => {
                cy.openActorSheet(name);
                cy.hm3Actor(name).then((actor) => {
                    const sheet = actor.sheet;
                    // ApplicationV2, not the AppV1 class it used to extend.
                    expect(sheet).to.be.instanceOf(
                        cy.state("window").foundry.applications.api.ApplicationV2,
                    );
                    // DocumentSheetV2 renders itself as the form.
                    expect(sheet.element.tagName.toLowerCase()).to.equal("form");
                    expect(sheet.element.classList.contains("hm3")).to.be.true;
                });
            });

            it("renders its header and body inside the window content", () => {
                cy.openActorSheet(name);
                cy.hm3Actor(name).then((actor) => {
                    const el = actor.sheet.element;
                    expect(el.querySelector(".window-content"), ".window-content").to.exist;
                    expect(el.querySelector(".sheet-header"), ".sheet-header").to.exist;
                });
            });

            it("shows exactly one active tab, and switches between them", () => {
                cy.openActorSheet(name);
                cy.hm3Actor(name).then((actor) => {
                    const el = actor.sheet.element;
                    const active = el.querySelectorAll('.tab[data-group="primary"].active');
                    expect(active.length, "one active tab on first render").to.equal(1);
                });

                if (tabs.length < 2) return;

                // Click each nav entry and confirm the matching content becomes
                // the active one. AppV2's changeTab drives this off
                // data-action="tab", which the templates gained in the
                // conversion — before it, nothing was listening.
                for (const tab of tabs) {
                    cy.hm3Actor(name).then((actor) => {
                        const el = actor.sheet.element;
                        const nav = el.querySelector(`nav .item[data-tab="${tab}"]`);
                        if (!nav) return; // this type does not carry that tab
                        nav.click();
                        const content = el.querySelector(`.tab[data-tab="${tab}"]`);
                        expect(content?.classList.contains("active"), `${tab} became active`).to.be
                            .true;
                        expect(
                            el.querySelectorAll('.tab[data-group="primary"].active').length,
                            `only ${tab} is active`,
                        ).to.equal(1);
                    });
                }
            });
        });
    }

    it("opens an item sheet for every item type", () => {
        // One sheet class serves all twelve types, choosing its template in
        // _configureRenderParts — the AppV2 replacement for AppV1's dynamic
        // `get template()`. A type whose template failed to resolve would throw
        // here rather than silently render blank.
        const types = [
            "skill",
            "spell",
            "invocation",
            "psionic",
            "weapongear",
            "containergear",
            "missilegear",
            "armorgear",
            "miscgear",
            "injury",
            "armorlocation",
            "trait",
        ];
        cy.window().then(async (win) => {
            for (const type of types) {
                // Rebuilt in the window's realm; a literal from the spec's
                // realm fails Foundry's plain-object check.
                const item = await win.Item.implementation.create(
                    win.JSON.parse(JSON.stringify({ name: `E2E ${type}`, type })),
                );
                expect(item, `created ${type}`).to.exist;
                await item.sheet.render(true);
                expect(item.sheet.element, `${type} sheet element`).to.exist;
                expect(item.sheet.element.querySelector(".sheet-header"), `${type} sheet header`).to
                    .exist;
                await item.sheet.close();
                await item.delete();
            }
        });
    });

    after(() => cy.cleanupByPrefix("E2E "));
});
