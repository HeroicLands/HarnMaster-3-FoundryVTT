import { ART_PATHS } from "./art-paths.js";

/** Worlds stamped below this version run the legacy actor, item, scene and compendium steps. */
export const LEGACY_MIGRATION_VERSION = "1.2.19";

/** Worlds stamped below this version run the art path pass. */
export const ART_MIGRATION_VERSION = "1.6.6";

/** Invocation spelling changed independently of the destructive legacy schema pass. */
export const DEITY_MIGRATION_VERSION = "1.6.6";

const versionParts = (v) =>
    String(v)
        .split(".")
        .map((n) => parseInt(n, 10) || 0);

function isBelow(version, threshold) {
    const a = versionParts(version);
    const b = versionParts(threshold);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const x = a[i] ?? 0;
        const y = b[i] ?? 0;
        if (x !== y) return x < y;
    }
    return false;
}

/**
 * Decide which migration steps a world needs.
 * @param {string|number|undefined} storedVersion  The world's stamped migration version; empty when never stamped
 * @return {{legacy: boolean, art: boolean, deity: boolean}}       `legacy` covers the actor, item, scene and compendium steps
 */
export function migrationStepsFor(storedVersion) {
    // A world that was never stamped is as likely new as old, so only the art pass runs.
    if (!storedVersion || storedVersion === "0") return { legacy: false, art: true, deity: false };
    return {
        legacy: isBelow(storedVersion, LEGACY_MIGRATION_VERSION),
        art: isBelow(storedVersion, ART_MIGRATION_VERSION),
        deity: isBelow(storedVersion, DEITY_MIGRATION_VERSION),
    };
}

/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs
 * @param {{legacy: boolean, art: boolean, deity: boolean}} [steps]  Which steps to run; see `migrationStepsFor`
 * @return {Promise}      A Promise which resolves once the migration is completed
 */
export const migrateWorld = async function (steps = { legacy: true, art: true, deity: true }) {
    ui.notifications.info(
        `Applying HM3 System Migration for version ${game.system.version}. Please be patient and do not close your game or shut down your server.`,
        { permanent: true },
    );
    console.log(`HM3 | Starting Migration`);

    if (steps.legacy) {
        // Migrate World Actors
        for (let a of game.actors.contents) {
            try {
                const updateData = migrateActorData(a.toObject());
                if (!foundry.utils.isEmpty(updateData)) {
                    console.log(`HM3 | Migrating Actor ${a.name}`);
                    await a.update(updateData, { enforceTypes: false });
                }
            } catch (err) {
                err.message = `Failed HM3 system migration for Actor ${a.name}: ${err.message}`;
                console.error(err);
            }
        }

        // Migrate World Items
        for (let i of game.items.contents) {
            try {
                const updateData = migrateItemData(i.toObject());
                if (!foundry.utils.isEmpty(updateData)) {
                    console.log(`HM3 | Migrating Item ${i.name}`);
                    await i.update(updateData, { enforceTypes: false });
                }
            } catch (err) {
                err.message = `Failed HM3 system migration for Item ${i.name}: ${err.message}`;
                console.error(err);
            }
        }

        // Migrate Actor Override Tokens
        for (let s of game.scenes.contents) {
            try {
                const updateData = migrateSceneData(s.toObject());
                if (!foundry.utils.isEmpty(updateData)) {
                    console.log(`HM3 | Migrating Scene ${s.name}`);
                    await s.update(updateData, { enforceTypes: false });
                }
            } catch (err) {
                err.message = `Failed HM3 system migration for Scene ${s.name}: ${err.message}`;
                console.error(err);
            }
        }

        // Migrate World Compendium Packs
        console.log(`HM3 | Migrating Compendium Packs`);
        for (let p of game.packs) {
            if (p.metadata.package !== "world") continue;
            if (!["Actor", "Item", "Scene"].includes(p.documentName)) continue;
            console.log(`HM3 | Starting Migration for Pack ${p.metadata.label}`);
            await migrateCompendium(p);
        }
    }

    if (steps.deity && !steps.legacy) await migrateWorldDeity();

    // Rewrite the system's art paths from images/ to assets/
    if (steps.art) {
        console.log(`HM3 | Migrating art paths`);
        await migrateWorldArt();
    }

    // Set the migration as complete
    game.settings.set("hm3", "systemMigrationVersion", game.system.version);
    console.log(`HM3 | Migration Complete`);
    ui.notifications.info(`HM3 System Migration to version ${game.system.version} completed!`, {
        permanent: true,
    });
};

/* -------------------------------------------- */

/**
 * Apply migration rules to all Entities within a single Compendium pack
 * @param pack
 * @return {Promise}
 */
export const migrateCompendium = async function (pack) {
    const documentName = pack.documentName;
    if (!["Actor", "Item", "Scene"].includes(documentName)) return;

    // Unlock the pack for editing
    const wasLocked = pack.locked;
    await pack.configure({ locked: false });

    // Begin by requesting server-side data model migration and get the migrated content
    await pack.migrate();
    const documents = await pack.getDocuments();

    // Iterate over compendium entries - applying fine-tuned migration functions
    for (let doc of documents) {
        let updateData = {};
        try {
            switch (documentName) {
                case "Actor":
                    updateData = migrateActorData(doc.toObject());
                    break;
                case "Item":
                    updateData = migrateItemData(doc.toObject());
                    break;
                case "Scene":
                    updateData = migrateSceneData(doc.toObject());
                    break;
            }

            // Save the entry, if data was changed
            if (foundry.utils.isEmpty(updateData)) continue;
            await doc.update(updateData);
            console.log(`Migrated ${documentName} ${doc.name} in Compendium ${pack.collection}`);
        } catch (err) {
            // Handle migration failures
            err.message = `Failed HM3 system migration for ${doc.name} in pack ${pack.collection}: ${err.message}`;
            console.error(err);
        }
    }

    // Apply the original locked status for the pack
    await pack.configure({ locked: wasLocked });
    console.log(`Migrated all ${documentName} entities from Compendium ${pack.collection}`);
};

/* -------------------------------------------- */
/*  Document Type Migration Helpers               */
/* -------------------------------------------- */

/**
 * Migrate a single Actor to incorporate latest data model changes
 * Return an Object of updateData to be applied
 * @param {Actor} actor   The actor to Update
 * @return {Object}       The updateData to apply
 */
export const migrateActorData = function (actor) {
    const updateData = {};
    const actorData = actor.system;

    // Actor Data Updates
    /*
     * -------- ACTOR UPDATES GO HERE -------------
     */

    if (actorData.abilities.strength.hasOwnProperty("effective")) {
        updateData["system.abilities.strength.-=effective"] = null;
    }

    if (actorData.abilities.stamina.hasOwnProperty("effective")) {
        updateData["system.abilities.stamina.-=effective"] = null;
    }

    if (actorData.abilities.dexterity.hasOwnProperty("effective")) {
        updateData["system.abilities.dexterity.-=effective"] = null;
    }

    if (actorData.abilities.agility.hasOwnProperty("effective")) {
        updateData["system.abilities.agility.-=effective"] = null;
    }

    if (actorData.abilities.intelligence.hasOwnProperty("effective")) {
        updateData["system.abilities.intelligence.-=effective"] = null;
    }

    if (actorData.abilities.aura.hasOwnProperty("effective")) {
        updateData["system.abilities.aura.-=effective"] = null;
    }

    if (actorData.abilities.will.hasOwnProperty("effective")) {
        updateData["system.abilities.will.-=effective"] = null;
    }

    if (actorData.abilities.eyesight.hasOwnProperty("effective")) {
        updateData["system.abilities.eyesight.-=effective"] = null;
    }

    if (actorData.abilities.hearing.hasOwnProperty("effective")) {
        updateData["system.abilities.hearing.-=effective"] = null;
    }

    if (actorData.abilities.smell.hasOwnProperty("effective")) {
        updateData["system.abilities.smell.-=effective"] = null;
    }

    if (actorData.abilities.voice.hasOwnProperty("effective")) {
        updateData["system.abilities.voice.-=effective"] = null;
    }

    if (actorData.abilities.hasOwnProperty("comliness")) {
        // Rename 'comliness' to 'comeliness'
        updateData["system.abilities.comeliness.base"] = actorData.abilities.comliness.base;
        updateData["system.abilities.-=comliness"] = null;
    }

    if (actorData.abilities.morality.hasOwnProperty("effective")) {
        updateData["system.abilities.morality.-=effective"] = null;
    }

    if (actorData.abilities.hasOwnProperty("endurance")) {
        if (actorData.abilities.endurance.base) {
            updateData["flags.hm-gold.ability-endurance"] = actorData.abilities.endurance.base;
        }
        updateData["system.abilities.-=endurance"] = null;
    }

    if (actorData.abilities.hasOwnProperty("speed")) {
        if (actorData.abilities.speed.base) {
            updateData["flags.hm-gold.ability-speed"] = actorData.abilities.speed.base;
        }
        updateData["system.abilities.-=speed"] = null;
    }

    if (actorData.abilities.hasOwnProperty("touch")) {
        if (actorData.abilities.touch.base) {
            updateData["flags.hm-gold.ability-touch"] = actorData.abilities.touch.base;
        }
        updateData["system.abilities.-=touch"] = null;
    }

    if (actorData.abilities.hasOwnProperty("frame")) {
        if (actorData.abilities.frame.base) {
            updateData["flags.hm-gold.ability-frame"] = actorData.abilities.frame.base;
        }
        updateData["system.abilities.-=frame"] = null;
    }

    // if (actorData.hasOwnProperty('shockIndex')) {
    //   updateData['system.-=shockIndex'] = null
    // }

    if (actorData.hasOwnProperty("dodge")) {
        updateData["system.-=dodge"] = null;
    }

    if (actorData.hasOwnProperty("initiative")) {
        updateData["system.-=initiative"] = null;
    }

    if (actorData.hasOwnProperty("endurance")) {
        updateData["system.-=endurance"] = null;
    }

    if (actorData.move.hasOwnProperty("effective")) {
        updateData["system.move.-=effective"] = null;
    }

    if (actorData.hasOwnProperty("universalPenalty")) {
        updateData["system.-=universalPenalty"] = null;
    }

    if (actorData.hasOwnProperty("physicalPenalty")) {
        updateData["system.-=physicalPenalty"] = null;
    }

    if (actorData.hasOwnProperty("totalInjuryLevels")) {
        updateData["system.-=totalInjuryLevels"] = null;
    }

    if (actorData.hasOwnProperty("hasCondition")) {
        updateData["system.-=hasCondition"] = null;
    }

    if (actorData.hasOwnProperty("encumbrance")) {
        updateData["system.-=encumbrance"] = null;
    }

    if (actorData.hasOwnProperty("totalWeight")) {
        updateData["system.-=totalWeight"] = null;
    }

    if (!actorData.hasOwnProperty("macros") || !actorData.macros.hasOwnProperty("type")) {
        updateData["system.macros.command"] = "";
        updateData["system.macros.type"] = "script";
    }

    // Remove deprecated fields
    _migrateRemoveDeprecated(actor, updateData);

    // Migrate Owned Items
    if (!actor.items) return updateData;

    if (!actor.items) return updateData;
    const items = actor.items.reduce((arr, i) => {
        // Migrate the Owned Item
        const itemData = i instanceof CONFIG.Item.documentClass ? i.toObject() : i;
        let itemUpdate = migrateItemData(itemData);

        // Update the Owned Item
        if (!foundry.utils.isEmpty(itemUpdate)) {
            itemUpdate._id = itemData._id;
            arr.push(foundry.utils.expandObject(itemUpdate));
        }

        return arr;
    }, []);
    if (items.length > 0) updateData.items = items;
    return updateData;
};

/* -------------------------------------------- */

/**
 * Scrub an Actor's system data, removing all keys which are not explicitly defined in the system template
 * @param {Object} actorData    The data object for an Actor
 * @return {Object}             The scrubbed Actor data
 */
function cleanActorData(actorData) {
    // Scrub system data against the type's schema. This was `game.model`, the
    // template.json registry, which no longer carries the fields.
    const model = CONFIG.Actor.dataModels[actorData.type]?.schema.getInitialValue({});
    if (model) actorData.system = filterObject(actorData.system, model);

    // Scrub system flags
    const allowedFlags = CONFIG.HM3.allowedActorFlags.reduce((obj, f) => {
        obj[f] = null;
        return obj;
    }, {});
    if (actorData.flags.hm3) {
        actorData.flags.hm3 = filterObject(actorData.flags.hm3, allowedFlags);
    }

    // Return the scrubbed data
    return actorData;
}

/* -------------------------------------------- */

/**
 * Migrate a single Item to incorporate latest data model changes
 * @param itemData
 */
export const migrateItemData = function (item) {
    const updateData = {};

    /*
     * -------- ITEM UPDATES GO HERE -------------
     */
    if (!item.system.macros?.hasOwnProperty("type")) {
        updateData["system.macros.command"] = "";
        updateData["system.macros.type"] = "script";
    }

    Object.assign(updateData, migrateInvocationDeityData(item));

    if (item.type === "weapongear") {
        if (item.system.hasOwnProperty("squeeze")) {
            if (item.system.squeeze) {
                updateData["flags.hm-gold.squeeze-impact"] = item.system.squeeze;
            }
            updateData["system.-=squeeze"] = null;
        }

        if (item.system.hasOwnProperty("tear")) {
            if (item.system.squeeze) {
                updateData["flags.hm-gold.tear-impact"] = item.system.tear;
            }
            updateData["system.-=tear"] = null;
        }
    }

    if (item.type === "missilegear") {
        if (item.system.range.hasOwnProperty("extreme64")) {
            updateData["system.range.-=extreme64"] = null;
        }

        if (item.system.range.hasOwnProperty("extreme128")) {
            updateData["system.range.-=extreme128"] = null;
        }

        if (item.system.range.hasOwnProperty("extreme256")) {
            updateData["system.range.-=extreme256"] = null;
        }

        if (item.system.impact.hasOwnProperty("extreme64")) {
            if (item.system.impact.extreme64) {
                updateData["flags.hm-gold.range4-impact"] = item.system.impact.short;
                updateData["flags.hm-gold.range8-impact"] = item.system.impact.medium;
                updateData["flags.hm-gold.range16-impact"] = item.system.impact.long;
                updateData["flags.hm-gold.range32-impact"] = item.system.impact.extreme;
                updateData["flags.hm-gold.range64-impact"] = item.system.impact.extreme64;
            }
            updateData["system.impact.-=extreme64"] = null;
        }

        if (item.system.impact.hasOwnProperty("extreme128")) {
            if (item.system.impact.extreme128) {
                updateData["flags.hm-gold.range128-impact"] = item.system.impact.extreme128;
            }
            updateData["system.impact.-=extreme128"] = null;
        }

        if (item.system.impact.hasOwnProperty("extreme256")) {
            if (item.system.impact.extreme256) {
                updateData["flags.hm-gold.range256-impact"] = item.system.impact.extreme256;
            }
            updateData["system.impact.-=extreme256"] = null;
        }
    }

    if (item.type === "armorgear") {
        if (!item.system.protection.hasOwnProperty("squeeze")) {
            if (item.system.protection.squeeze) {
                updateData["flags.hm-gold.squeeze"] = item.system.protection.squeeze;
            }
            updateData["system.protection.-=squeeze"] = null;
        }

        if (item.system.protection.hasOwnProperty("tear")) {
            if (item.system.protection.tear) {
                updateData["flags.hm-gold.tear"] = item.system.protection.tear;
            }
            updateData["system.protection.-=tear"] = null;
        }
    }

    if (item.type === "armorlocation") {
        if (item.system.hasOwnProperty("squeeze")) {
            if (item.system.squeeze) {
                updateData["flags.hm-gold.squeeze"] = item.system.squeeze;
            }
            updateData["system.-=squeeze"] = null;
        }

        if (item.system.hasOwnProperty("tear")) {
            if (item.system.tear) {
                updateData["flags.hm-gold.tear"] = item.system.tear;
            }
            updateData["system.-=tear"] = null;
        }

        if (item.system.probWeight.hasOwnProperty("arms")) {
            if (item.system.probWeight.arms) {
                updateData["flags.hm-gold.probweight-arms"] = item.system.probWeight.arms;
            }
            updateData["system.probWeight.-=arms"] = null;
        }
    }

    // Remove deprecated fields
    _migrateRemoveDeprecated(item, updateData);

    // Return the migrated update data
    return updateData;
};

/* -------------------------------------------- */

/**
 * Migrate a single Scene to incorporate changes to the data model of it's actor data overrides
 * Return an Object of updateData to be applied
 * @param {Object} scene  The Scene data to Update
 * @return {Object}       The updateData to apply
 */
export const migrateSceneData = function (scene) {
    const tokens = scene.tokens.map((token) => {
        const t = foundry.utils.duplicate(token);
        if (!t.actorId || t.actorLink) {
            t.actorData = {};
        } else if (!game.actors.has(t.actorId)) {
            t.actorId = null;
            t.actorData = {};
        } else if (t.actorData) {
            const actorData = foundry.utils.duplicate(t.actorData);
            actorData.type = token.actor?.type;
            const update = migrateActorData(actorData);
            ["items", "effects"].forEach((embeddedName) => {
                if (!update[embeddedName]?.length) return;
                const updates = new Map(update[embeddedName].map((u) => [u._id, u]));
                t.actorData[embeddedName].forEach((original) => {
                    const update = updates.get(original._id);
                    if (update) foundry.utils.mergeObject(original, update);
                });
                delete update[embeddedName];
            });

            foundry.utils.mergeObject(t.actorData, update);
        }
        return t;
    });
    return { tokens };
};

/* -------------------------------------------- */
/*  Low level migration utilities
/* -------------------------------------------- */

/**
 * Migrate the actor bonuses object
 * @private
 */
//   function _migrateActorBonuses(actor, updateData) {
//     const b = game.model.Actor.character.bonuses;
//     for ( let k of Object.keys(actor.system.bonuses || {}) ) {
//       if ( k in b ) updateData[`data.bonuses.${k}`] = b[k];
//       else updateData[`data.bonuses.-=${k}`] = null;
//     }
//   }

/* -------------------------------------------- */

/**
 * A general migration to remove all fields from the data model which are flagged with a _deprecated tag
 * @private
 */
const _migrateRemoveDeprecated = function (ent, updateData) {
    const flat = foundry.utils.flattenObject(ent);

    const toPreDep = Object.entries(updateData).filter((e) => e[0]);
    // Identify objects to deprecate
    const toDeprecate = Object.entries(flat)
        .filter((e) => e[0].endsWith("_deprecated") && e[1] === true)
        .map((e) => {
            let parent = e[0].split(".");
            parent.pop();
            return parent.join(".");
        });

    // Remove them
    for (let k of toDeprecate) {
        let parts = k.split(".");
        parts[parts.length - 1] = "-=" + parts[parts.length - 1];
        updateData[`data.${parts.join(".")}`] = null;
    }
};

/* -------------------------------------------- */

/**
 * A general tool to purge flags from all entities in a Compendium pack.
 * @param {Compendium} pack   The compendium pack to clean
 * @private
 */
export async function purgeFlags(pack) {
    const cleanFlags = (flags) => {
        const flagshm3 = flags.hm3 || null;
        return flagshm3 ? { hm3: flagshm3 } : {};
    };
    await pack.configure({ locked: false });
    const content = await pack.getDocuments();
    for (let doc of content) {
        const update = { flags: cleanFlags(doc.flags) };
        if (pack.documentName === "Actor") {
            update.items = doc.items.map((i) => {
                i.flags = cleanFlags(i.flags);
                return i;
            });
        }
        await doc.update(update, { recursive: false });
        console.log(`HM3 | Purged flags from ${doc.name}`);
    }
    await pack.configure({ locked: true });
}

/* -------------------------------------------- */
/*  Art Path Migration                          */
/* -------------------------------------------- */

/**
 * A whole `systems/hm3/images/…` path: not preceded by a path character, so a
 * path that merely ends in it (`modules/x/systems/hm3/images/…`, a full URL) is
 * not one, and not followed by one, so it ends where the path ends. A single
 * leading slash is allowed and kept.
 */
const SYSTEM_ART_PATH =
    /(?<![A-Za-z0-9_.\/:-])(\/?)(systems\/hm3\/images\/[A-Za-z0-9_.\/-]+)(?![A-Za-z0-9_.\/-])/g;

/**
 * Rewrite every whole `systems/hm3/images/…` path in a string through
 * {@link ART_PATHS}: a bare path, one inside HTML (`src="…"`) and one inside
 * markdown image syntax alike. A path the table does not name, a path under
 * `assets/` and any other path are left as they are, so a second run changes
 * nothing.
 *
 * @param {unknown} value A stored path, or HTML or markdown text.
 * @returns {unknown} The rewritten string, or `value` itself when it is not a
 *   string or names no old path.
 */
export function rewriteSystemArtPath(value) {
    if (typeof value !== "string" || !value.includes("systems/hm3/images/")) return value;
    return value.replace(SYSTEM_ART_PATH, (match, slash, path) =>
        ART_PATHS.has(path) ? `${slash}${ART_PATHS.get(path)}` : match,
    );
}

/**
 * Record `value`'s rewrite at `key` of `update` when it differs.
 *
 * @returns {boolean} Whether anything was recorded.
 */
function setRewritten(update, key, value) {
    const rewritten = rewriteSystemArtPath(value);
    if (rewritten === value) return false;
    update[key] = rewritten;
    return true;
}

/**
 * The update for each member of an embedded collection that changed, each
 * carrying its `_id`, or `undefined` when none did.
 */
function embeddedArt(collection, migrate) {
    if (!Array.isArray(collection)) return undefined;
    const updates = [];
    for (const member of collection) {
        if (!member?._id) continue;
        const update = migrate(member);
        if (Object.keys(update).length) updates.push({ _id: member._id, ...update });
    }
    return updates.length ? updates : undefined;
}

/** `{ src }` for a texture whose `src` changed, else `undefined`. */
function textureArt(texture) {
    const update = {};
    return setRewritten(update, "src", texture?.src) ? update : undefined;
}

/** The update for an Active Effect: its `img`. */
function migrateEffectArt(effect) {
    const update = {};
    setRewritten(update, "img", effect.img);
    return update;
}

/**
 * The art-path update for an Item's source: `img`, and each embedded effect's
 * `img`.
 *
 * @param {object} item An Item's source data, as `toObject()` returns it.
 * @returns {object} The update; empty when nothing names an old path.
 */
export function migrateItemArt(item) {
    const update = {};
    setRewritten(update, "img", item.img);
    const effects = embeddedArt(item.effects, migrateEffectArt);
    if (effects) update.effects = effects;
    return update;
}

/**
 * The fields an Actor and an unlinked token's actor delta share: `img`,
 * `system.bioImage`, and the embedded items and effects.
 */
function actorBodyArt(actor) {
    const update = {};
    setRewritten(update, "img", actor.img);
    const system = {};
    if (setRewritten(system, "bioImage", actor.system?.bioImage)) update.system = system;
    const items = embeddedArt(actor.items, migrateItemArt);
    if (items) update.items = items;
    const effects = embeddedArt(actor.effects, migrateEffectArt);
    if (effects) update.effects = effects;
    return update;
}

/**
 * The art-path update for a token: its texture and dynamic-ring subject, and
 * for an unlinked token the actor delta (`delta`, or `actorData` in data that
 * still carries it).
 */
function tokenArt(token) {
    const update = {};
    const texture = textureArt(token.texture);
    if (texture) update.texture = texture;
    const subject = {};
    if (setRewritten(subject, "texture", token.ring?.subject?.texture)) {
        update.ring = { subject };
    }
    for (const key of ["delta", "actorData"]) {
        if (!token[key] || typeof token[key] !== "object") continue;
        const delta = actorBodyArt(token[key]);
        if (Object.keys(delta).length) update[key] = delta;
    }
    return update;
}

/**
 * The art-path update for an Actor's source: `img`, the prototype token's
 * texture and ring subject, `system.bioImage`, and the embedded items (with
 * their effects) and effects.
 *
 * @param {object} actor An Actor's source data, as `toObject()` returns it.
 * @returns {object} The update; empty when nothing names an old path.
 */
export function migrateActorArt(actor) {
    const update = actorBodyArt(actor);
    if (actor.prototypeToken) {
        const token = tokenArt({
            texture: actor.prototypeToken.texture,
            ring: actor.prototypeToken.ring,
        });
        if (Object.keys(token).length) update.prototypeToken = token;
    }
    return update;
}

/** A tile or a note: its texture. */
function placeableTextureArt(placeable) {
    const texture = textureArt(placeable.texture);
    return texture ? { texture } : {};
}

/** A scene level: its background, foreground and fog images. */
function levelArt(level) {
    const update = {};
    for (const key of ["background", "foreground", "fog"]) {
        const texture = textureArt(level[key]);
        if (texture) update[key] = texture;
    }
    return update;
}

/**
 * The art-path update for a Scene's source: its tokens (with the deltas of
 * unlinked ones), tiles and notes, and the background, foreground and fog
 * images of its levels, which is where a scene's background is stored.
 *
 * @param {object} scene A Scene's source data, as `toObject()` returns it.
 * @returns {object} The update; empty when nothing names an old path.
 */
export function migrateSceneArt(scene) {
    const update = {};
    const tokens = embeddedArt(scene.tokens, tokenArt);
    if (tokens) update.tokens = tokens;
    const tiles = embeddedArt(scene.tiles, placeableTextureArt);
    if (tiles) update.tiles = tiles;
    const notes = embeddedArt(scene.notes, placeableTextureArt);
    if (notes) update.notes = notes;
    const levels = embeddedArt(scene.levels, levelArt);
    if (levels) update.levels = levels;
    return update;
}

/** A journal page: its `src`, and the images in its HTML and markdown text. */
function pageArt(page) {
    const update = {};
    setRewritten(update, "src", page.src);
    const text = {};
    setRewritten(text, "content", page.text?.content);
    setRewritten(text, "markdown", page.text?.markdown);
    if (Object.keys(text).length) update.text = text;
    return update;
}

/**
 * The art-path update for a JournalEntry's source: each page's `src` and the
 * images its text embeds.
 *
 * @param {object} entry A JournalEntry's source data, as `toObject()` returns it.
 * @returns {object} The update; empty when nothing names an old path.
 */
export function migrateJournalArt(entry) {
    const update = {};
    const pages = embeddedArt(entry.pages, pageArt);
    if (pages) update.pages = pages;
    return update;
}

/**
 * The art-path update for a Macro's source: its `img`.
 *
 * @param {object} macro A Macro's source data, as `toObject()` returns it.
 * @returns {object} The update; empty when nothing names an old path.
 */
export function migrateMacroArt(macro) {
    const update = {};
    setRewritten(update, "img", macro.img);
    return update;
}

/** A table result: its `img`. */
function resultArt(result) {
    const update = {};
    setRewritten(update, "img", result.img);
    return update;
}

/**
 * The art-path update for a RollTable's source: its `img` and each result's.
 *
 * @param {object} table A RollTable's source data, as `toObject()` returns it.
 * @returns {object} The update; empty when nothing names an old path.
 */
export function migrateRollTableArt(table) {
    const update = {};
    setRewritten(update, "img", table.img);
    const results = embeddedArt(table.results, resultArt);
    if (results) update.results = results;
    return update;
}

/** The art-path rewrite for each document class the migration visits. */
const ART_MIGRATIONS = Object.freeze({
    Actor: migrateActorArt,
    Item: migrateItemArt,
    Scene: migrateSceneArt,
    JournalEntry: migrateJournalArt,
    Macro: migrateMacroArt,
    RollTable: migrateRollTableArt,
});

/**
 * The art-path rewrite for a document class.
 *
 * @param {string} documentName A document class name, such as `"Actor"`.
 * @returns {((source: object) => object)|undefined} Its rewrite, or
 *   `undefined` for a class that stores none of the system's art.
 */
export function artMigrationFor(documentName) {
    return Object.hasOwn(ART_MIGRATIONS, documentName) ? ART_MIGRATIONS[documentName] : undefined;
}

/**
 * Rewrite one document's stored art paths, updating it only when something
 * changed. A failure is logged and does not stop the migration.
 *
 * @param {foundry.abstract.Document} doc The document.
 * @param {string} where Where it is, for the log.
 */
async function migrateDocumentArt(doc, where) {
    const migrate = artMigrationFor(doc.documentName);
    if (!migrate) return;
    try {
        const update = migrate(doc.toObject());
        if (!Object.keys(update).length) return;
        console.log(`HM3 | Migrating art paths of ${doc.documentName} ${doc.name}${where}`);
        await doc.update(update);
    } catch (err) {
        err.message = `Failed HM3 art path migration for ${doc.documentName} ${doc.name}${where}: ${err.message}`;
        console.error(err);
    }
}

/**
 * Rewrite the system's art paths across the world: actors, items, scenes,
 * journal entries, macros and roll tables, then every unlocked world
 * compendium holding one of those. A locked compendium is left as it is; its
 * old paths still resolve to the copy of the art the system ships under
 * `images/`.
 */
export async function migrateWorldArt() {
    for (const collection of [
        game.actors,
        game.items,
        game.scenes,
        game.journal,
        game.macros,
        game.tables,
    ]) {
        for (const doc of collection.contents) await migrateDocumentArt(doc, "");
    }

    for (const pack of game.packs) {
        if (pack.metadata.packageType !== "world" && pack.metadata.package !== "world") continue;
        if (pack.locked || !artMigrationFor(pack.documentName)) continue;
        const where = ` in Compendium ${pack.collection}`;
        try {
            for (const doc of await pack.getDocuments()) await migrateDocumentArt(doc, where);
        } catch (err) {
            err.message = `Failed HM3 art path migration for Compendium ${pack.collection}: ${err.message}`;
            console.error(err);
        }
    }
}

/**
 * Return only the invocation spelling update, preserving existing deity values.
 * This pass is safe on modern items and does not apply legacy schema changes.
 * @param {object} item - Source item data.
 * @returns {object} The minimal deity update, or an empty object.
 */
export function migrateInvocationDeityData(item) {
    if (item.type !== "invocation" || !Object.hasOwn(item.system ?? {}, "diety")) return {};
    const update = { "system.-=diety": null };
    if (!item.system.deity && item.system.diety) update["system.deity"] = item.system.diety;
    return update;
}

/** Update a world/compendium actor or item without running legacy migrations. */
async function migrateDocumentDeity(doc) {
    const data = doc.toObject();
    let update = {};
    if (doc.documentName === "Item") update = migrateInvocationDeityData(data);
    if (doc.documentName === "Actor") {
        const items = (data.items ?? []).flatMap((item) => {
            const patch = migrateInvocationDeityData(item);
            return Object.keys(patch).length ? [{ _id: item._id, ...patch }] : [];
        });
        if (items.length) update = { items };
    }
    if (Object.keys(update).length) await doc.update(update, { enforceTypes: false });
    if (doc.documentName === "Scene") {
        // Scene/compendium source may carry synthetic items in either the v14
        // delta or older actorData. Patch only those embedded invocations.
        const tokens = (data.tokens ?? []).flatMap((token) => {
            if (token.actorLink) return [];
            const patch = { _id: token._id };
            for (const key of ["delta", "actorData"]) {
                const items = (token[key]?.items ?? []).flatMap((item) => {
                    const update = migrateInvocationDeityData(item);
                    return Object.keys(update).length ? [{ _id: item._id, ...update }] : [];
                });
                if (items.length) patch[key] = { items };
            }
            return Object.keys(patch).length > 1 ? [patch] : [];
        });
        if (tokens.length) await doc.update({ tokens }, { enforceTypes: false });
    }
}

/** Migrate deity spelling across modern world and world-owned compendium documents. */
export async function migrateWorldDeity() {
    for (const collection of [game.actors, game.items, game.scenes]) {
        for (const doc of collection.contents) await migrateDocumentDeity(doc);
    }
    for (const pack of game.packs) {
        if (pack.metadata.package !== "world" && pack.metadata.packageType !== "world") continue;
        if (!["Actor", "Item", "Scene"].includes(pack.documentName)) continue;
        const wasLocked = pack.locked;
        try {
            await pack.configure({ locked: false });
            for (const doc of await pack.getDocuments()) await migrateDocumentDeity(doc);
        } finally {
            await pack.configure({ locked: wasLocked });
        }
    }
}
