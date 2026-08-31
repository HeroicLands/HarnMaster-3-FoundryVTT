/**
 * Chat messages carry what they are supposed to carry.
 *
 * Three separate v14 schema changes met here, each of which failed silently
 * rather than loudly:
 *
 *  - `roll` became `rolls`, an array. The old key was dropped on the way in, so
 *    every roll message posted with its roll detached — nothing to expand, and
 *    nothing for Dice So Nice to animate (issue #389).
 *  - `user` became `author`. Also dropped, so a message posted on another
 *    user's behalf lost its attribution.
 *  - `type` became `style`, and `type` now means the document subtype. The old
 *    integer was a validation error rather than a silent drop.
 *
 * Test plan: Part 5.1/5.2 and Appendix A.
 */
describe("chat messages", () => {
    before(() => cy.login());

    /** Post a d100 test through the system's own dice layer. */
    const rollAbility = (actorName, ability) =>
        cy
            .hm3Actor(actorName)
            .then((actor) =>
                cy
                    .window()
                    .then((win) => win.game.hm3.macros.testAbilityD100Roll(ability, true, actor)),
            );

    /** The most recently posted chat message. */
    const latest = () => cy.window().then((win) => win.game.messages.contents.at(-1));

    beforeEach(() =>
        cy
            .window()
            .then((win) =>
                win.game.messages.documentClass.deleteDocuments(win.game.messages.map((m) => m.id)),
            ),
    );

    it("posts an ability roll", () => {
        rollAbility("Sir Baris", "strength");
        latest().should("exist");
    });

    it("keeps the roll attached to the message", () => {
        // The regression behind #389: `messageData.roll` was silently discarded,
        // so `rolls` came out empty and there was no dice animation.
        rollAbility("Sir Baris", "strength");
        latest().then((msg) => {
            expect(msg.rolls, "message.rolls").to.have.length.of.at.least(1);
            expect(msg.rolls[0].total, "roll total").to.be.a("number");
            expect(msg.isRoll, "message.isRoll").to.be.true;
        });
    });

    it("attributes the message to the acting user", () => {
        rollAbility("Sir Baris", "strength");
        cy.window().then((win) => {
            latest().then((msg) => {
                expect(msg.author?.id, "message author").to.equal(win.game.user.id);
            });
        });
    });

    it("sets a valid style, and leaves type as the document subtype", () => {
        rollAbility("Sir Baris", "strength");
        cy.window().then((win) => {
            latest().then((msg) => {
                expect(Object.values(win.CONST.CHAT_MESSAGE_STYLES)).to.include(msg.style);
                // `type` is a DocumentTypeField now; an integer here would have
                // failed validation outright.
                expect(msg.type).to.be.a("string");
            });
        });
    });

    it("renders the message into the log", () => {
        rollAbility("Sir Baris", "strength");
        latest().then((msg) => {
            cy.get(`.chat-message[data-message-id="${msg.id}"]`, { timeout: 10000 }).should(
                "exist",
            );
        });
    });

    it("wires up chat card action buttons", () => {
        // `chatListeners` bound with jQuery's `html.on(...)`, but the chat log
        // has handed over an HTMLElement since v13 — so this threw and every
        // card button on every message went dead. The listener is delegated
        // from the log root now.
        cy.createDocument("ChatMessage", {
            content: `<div class="hm3 chat-card">
                <div class="card-buttons">
                    <button data-action="e2e-probe">Probe</button>
                </div>
            </div>`,
        });
        cy.get(".card-buttons button[data-action='e2e-probe']", { timeout: 10000 }).should("exist");
        cy.window().then((win) => {
            const button = win.document.querySelector(
                ".card-buttons button[data-action='e2e-probe']",
            );
            expect(button, "probe button").to.exist;

            // `_onChatCardAction` calls preventDefault() as soon as it matches a
            // card button, and nothing undoes that — unlike `disabled`, which it
            // sets on entry and clears again before returning.
            const event = new win.MouseEvent("click", { bubbles: true, cancelable: true });
            button.dispatchEvent(event);
            expect(event.defaultPrevented, "HM3's delegated handler ran").to.be.true;
        });
    });

    after(() =>
        cy
            .window()
            .then((win) =>
                win.game.messages.documentClass.deleteDocuments(win.game.messages.map((m) => m.id)),
            ),
    );
});
