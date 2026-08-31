/**
 * Log in to the seeded world and wait until the game client is ready.
 *
 * Authenticates against Foundry's `/join` endpoint — the same POST the join
 * screen makes — with the seeded Gamemaster, then loads `/game` and waits for
 * `game.ready`. Credentials come from `Cypress.env`, populated by
 * `cypress.config.mjs` from the same resolution the seed used, so a spec only
 * ever calls `cy.login()`.
 */
Cypress.Commands.add("login", (opts = {}) => {
    const userId = opts.userId ?? Cypress.env("gmId");
    const password = opts.password ?? Cypress.env("gmPassword");

    cy.request({
        method: "POST",
        url: "/join",
        // Foundry renamed this body field from `userid` to `userId` in 14.367;
        // `sessions.authenticateUser` destructures one or the other depending
        // on the build. Sending both spans the whole supported range — the
        // handler takes the name it wants and ignores the other.
        body: { action: "join", userid: userId, userId, password },
    }).then((res) => {
        // A successful join answers JSON. When the world is not active Foundry
        // answers 200 with an HTML error page, so assert on the payload rather
        // than the status code.
        expect(res.body, "join response").to.have.property("status", "success");
    });

    cy.visit("/game");
    cy.window({ timeout: 60000 }).its("game").its("ready").should("eq", true);
});

/**
 * The seeded actor of a given name, as a live document.
 *
 * @param {string} name - The actor's name.
 */
Cypress.Commands.add("hm3Actor", (name) =>
    cy.window().then((win) => {
        const actor = win.game.actors.getName(name);
        expect(actor, `actor "${name}" exists in the seeded world`).to.exist;
        return actor;
    }),
);

/**
 * Open an actor's sheet and wait for it to be on screen.
 *
 * Waits on the rendered element rather than on `render()` resolving:
 * ApplicationV2 resolves its render promise before the parts are attached, and
 * asserting too early is the most common way one of these specs goes flaky.
 *
 * @param {string} name - The actor's name.
 */
Cypress.Commands.add("openActorSheet", (name) => {
    cy.hm3Actor(name).then((actor) => {
        actor.sheet.render(true);
        return cy.get(`#${CSS.escape(actor.sheet.id)}`, { timeout: 20000 }).should("be.visible");
    });
});

/**
 * Close every open application, so one spec's windows cannot confuse the next.
 */
Cypress.Commands.add("closeAllSheets", () =>
    cy.window().then((win) => {
        for (const app of Object.values(win.ui.windows ?? {})) app.close?.();
        for (const app of win.foundry.applications.instances?.values?.() ?? []) {
            if (app.constructor.name !== "ChatLog") app.close?.();
        }
    }),
);

/**
 * Delete every document created during a spec, identified by a name prefix.
 *
 * `testIsolation` is off so the page persists across a spec's tests; world
 * state is what has to be reset, and only what the spec made.
 *
 * @param {string} prefix - Name prefix marking a document as the spec's.
 */
Cypress.Commands.add("cleanupByPrefix", (prefix) =>
    cy.window().then(async (win) => {
        for (const collection of [win.game.actors, win.game.items]) {
            const ids = collection.filter((d) => d.name.startsWith(prefix)).map((d) => d.id);
            if (ids.length) await collection.documentClass.deleteDocuments(ids);
        }
    }),
);

/**
 * Create a document from the application's own realm.
 *
 * An object literal built in the spec's realm is not a plain object as far as
 * the game window is concerned — Foundry's constructor check rejects it with
 * "must be constructed with a DataModel or Object". Round-tripping the payload
 * through the window's own JSON rebuilds it on the right side of the boundary.
 *
 * @param {string} documentName - e.g. "Item", "ChatMessage".
 * @param {object} data - The document data.
 * @param {object} [options] - Creation options; may carry a live `parent`.
 */
Cypress.Commands.add("createDocument", (documentName, data, options = {}) =>
    cy.window().then((win) => {
        const cls = win.CONFIG[documentName].documentClass;
        return cls.create(win.JSON.parse(JSON.stringify(data)), options);
    }),
);
