/**
 * The system initialises on Foundry v14.
 *
 * This is the spec the whole harness exists for. Before the v14 work, HM3's
 * `init` hook read `CONFIG.TinyMCE` — removed in v14 along with the editor — so
 * the hook threw on that line and *nothing after it ran*: no document classes,
 * no sheet registration, no settings. The system did not load at all.
 *
 * Everything here asserts on state that only exists if `init` ran to
 * completion, so a regression that breaks the hook fails these rather than
 * failing mysteriously somewhere later.
 */
describe("system initialisation", () => {
    before(() => cy.login());

    it("is the active system, at the expected generation", () => {
        cy.window().then((win) => {
            expect(win.game.system.id).to.equal("hm3");
            expect(Number(win.game.release.generation)).to.be.at.least(14);
        });
    });

    it("ran init to completion", () => {
        cy.window().then((win) => {
            // Assigned at the very end of the init hook, after the document
            // classes, the sheets and the fonts. If this is here, the whole
            // hook ran.
            expect(win.CONFIG.fontDefinitions).to.have.property("Lankorian Blackhand");
            expect(win.CONFIG.HM3, "CONFIG.HM3").to.exist;
            expect(win.game.hm3, "game.hm3 API").to.have.keys(
                "HarnMasterActor",
                "HarnMasterItem",
                "DiceHM3",
                "config",
                "macros",
                "migrations",
            );
        });
    });

    it("registered the custom document classes", () => {
        cy.window().then((win) => {
            expect(win.CONFIG.Actor.documentClass.name).to.equal("HarnMasterActor");
            expect(win.CONFIG.Item.documentClass.name).to.equal("HarnMasterItem");
            expect(win.CONFIG.Combat.documentClass.name).to.equal("HarnMasterCombat");
        });
    });

    it("registered a data model for every declared subtype", () => {
        cy.window().then((win) => {
            // template.json is gone; these are what replaced it. A subtype
            // declared in the manifest with no model would fall back to an
            // untyped blob and lose its defaults silently.
            const actorTypes = ["character", "creature", "container"];
            const itemTypes = [
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
            expect(Object.keys(win.CONFIG.Actor.dataModels)).to.have.members(actorTypes);
            expect(Object.keys(win.CONFIG.Item.dataModels)).to.have.members(itemTypes);
        });
    });

    it("has no TinyMCE configuration left to read", () => {
        // The exact thing that killed init. ProseMirror replaced it, and the
        // Highlight block moved to CONFIG.TextEditor.inserts.
        cy.window().then((win) => {
            expect(win.CONFIG.TinyMCE, "CONFIG.TinyMCE").to.be.undefined;
            const actions = win.CONFIG.TextEditor.inserts.map((i) => i.action);
            expect(actions).to.include("highlight");
        });
    });

    it("offers the Harnic fonts to the ProseMirror editor", () => {
        cy.window().then((win) => {
            const available =
                win.foundry.applications.settings.menus.FontConfig.getAvailableFonts();
            expect(available).to.include.members(["Lakise", "Runic", "Lankorian Blackhand"]);
        });
    });

    it("seeded the four test actors, each with a typed data model", () => {
        cy.window().then((win) => {
            for (const name of ["Sir Baris", "Mêgan of Geda", "Gârgún Warrior", "Treasure Chest"]) {
                const actor = win.game.actors.getName(name);
                expect(actor, name).to.exist;
                // A DataModel instance, not the plain object template.json gave.
                expect(actor.system, `${name} system`).to.be.instanceOf(
                    win.foundry.abstract.DataModel,
                );
            }
        });
    });

    it("computed derived data for a character", () => {
        // Endurance is (STR + STA + WIL) / 3, rounded. Sir Baris is 15/14/14.
        cy.hm3Actor("Sir Baris").then((actor) => {
            expect(actor.system.abilities.strength.base).to.equal(15);
            expect(actor.system.endurance).to.equal(Math.round((15 + 14 + 14) / 3));
            expect(actor.system.universalPenalty).to.equal(0);
        });
    });
});
