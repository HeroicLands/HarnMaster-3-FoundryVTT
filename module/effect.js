//import { HM3ActiveEffect } from './hm3-active-effect.js';

/**
 * Manage Active Effect instances through the Actor Sheet via effect control buttons.
 * @param {MouseEvent} event      The left-click event on the effect control
 * @param {Actor|Item} owner      The owning document which manages this effect
 * @param {HTMLElement} [control] The control that was clicked. The sheets
 *                                delegate, so `event.currentTarget` is the
 *                                sheet root rather than the button.
 */
export async function onManageActiveEffect(event, owner, control) {
    event.preventDefault();
    const a = control ?? event.currentTarget;
    const li = a.closest("li");
    const effect = li.dataset.effectId ? owner.effects.get(li.dataset.effectId) : null;
    switch (a.dataset.action) {
        case "create":
            const dlgTemplate = "systems/hm3/templates/dialog/active-effect-start.html";
            const dialogData = {
                gameTime: game.time.worldTime
            };
            if (game.combat) {
                dialogData.combatId = game.combat.id;
                dialogData.combatRound = game.combat.round;
                dialogData.combatTurn = game.combat.turn;
            }
            const html = await foundry.applications.handlebars.renderTemplate(dlgTemplate, dialogData);
    
            // Create the dialog window
            return foundry.applications.api.DialogV2.prompt({
                window: {title: "Select Start Time"},
                content: html,
                ok: {
                    label: "OK",
                    callback: async (event, button) => {
                    const formdata = new FormDataExtended(button.form).object;
                    const startType = formdata.startType;

                    // `name` and `img`, not `label` and `icon`: renamed in v11,
                    // and `name` is required and non-blank, so the old keys did
                    // not merely go unused — creation failed validation.
                    const aeData = {
                        name: "New Effect",
                        img: "icons/svg/aura.svg",
                        origin: owner.uuid
                    };
                    if (startType === 'nowGameTime') {
                        aeData['duration.startTime'] = dialogData.gameTime;
                        aeData['duration.seconds'] = 1;
                    } else if (startType === 'nowCombat') {
                        aeData['duration.combat'] = dialogData.combatId;
                        aeData['duration.startRound'] = dialogData.combatRound;
                        aeData['duration.startTurn'] = dialogData.combatTurn;
                        aeData['duration.rounds'] = 1;
                        aeData['duration.turns'] = 0;
                    }
                    return ActiveEffect.create(aeData, {parent: owner});
                }
                }
            });
        case "edit":
            return effect.sheet.render(true);
        case "delete":
            return effect.delete();
        case "toggle":
            const updateData = {};
            if (effect.disabled) {
                // Enable the Active Effect
                updateData['disabled'] = false;

                // Also set the timer to start now
                updateData['duration.startTime'] = game.time.worldTime;
                if (game.combat) {
                    updateData['duration.startRound'] = game.combat.round;
                    updateData['duration.startTurn'] = game.combat.turn;
                }
            } else {
                // Disable the Active Effect
                updateData['disabled'] = true;
            }
            return effect.update(updateData);
    }
}

/**
 * This function searches all actors and tokens that are owned
 * by the user and disables them if their duration has expired.
 */
export async function checkExpiredActiveEffects() {
    // Handle game actors first
    for (let actor of game.actors.values()) {
        if (actor.isOwner && actor.effects?.size) {
            await disableExpiredAE(actor);
        }
    }

    // Next, handle tokens (only unlinked tokens)
    for (let token of canvas.tokens.ownedTokens.values()) {
        if (!token.document.actorLink && token.actor?.effects?.size) {
            await disableExpiredAE(token.actor);
        }
    }
}

/**
 * Checks all of the active effects for a single actor and disables
 * them if their duration has expired.
 * 
 * @param {Actor} actor 
 */
async function disableExpiredAE(actor) {
    for (let effect of actor.effects.values()) {
        if (!effect.disabled) {
            const duration = effect.duration;
            if (duration.type !== 'none') {
                if (duration.remaining <= 0) {
                    await effect.update({'disabled': true});
                }
            }
        }
    }
}
