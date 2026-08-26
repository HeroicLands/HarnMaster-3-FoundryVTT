/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs
 * @return {Promise}      A Promise which resolves once the migration is completed
 */
export const migrateWorld = async function () {
  ui.notifications.info(`Applying HM3 System Migration for version ${game.system.version}. Please be patient and do not close your game or shut down your server.`, { permanent: true });
  console.log(`HM3 | Starting Migration`);

  // Migrate World Actors
  for (let a of game.actors.contents) {
    try {
      const updateData = migrateActorData(a.toObject());
      if (!foundry.utils.isObjectEmpty(updateData)) {
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
      if (!foundry.utils.isObjectEmpty(updateData)) {
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
      if (!foundry.utils.ObjectEmpty(updateData)) {
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
    if (p.metadata.package !== 'world') continue;
    if (!['Actor', 'Item', 'Scene'].includes(p.documentName)) continue;
    console.log(`HM3 | Starting Migration for Pack ${p.metadata.label}`);
    await migrateCompendium(p);
  }

  // Set the migration as complete
  game.settings.set("hm3", "systemMigrationVersion", game.system.version);
  console.log(`HM3 | Migration Complete`)
  ui.notifications.info(`HM3 System Migration to version ${game.system.version} completed!`, { permanent: true });
};

/* -------------------------------------------- */

/**
 * Apply migration rules to all Entities within a single Compendium pack
 * @param pack
 * @return {Promise}
 */
 export const migrateCompendium = async function(pack) {
  const doc = pack.documentName;
  if ( !["Actor", "Item", "Scene"].includes(doc) ) return;

  // Unlock the pack for editing
  const wasLocked = pack.locked;
  await pack.configure({locked: false});

  // Begin by requesting server-side data model migration and get the migrated content
  await pack.migrate();
  const documents = await pack.getDocuments();

  // Iterate over compendium entries - applying fine-tuned migration functions
  for ( let doc of documents ) {
    let updateData = {};
    try {
      switch (doc) {
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
      if ( foundry.utils.isObjectEmpty(updateData) ) continue;
      await doc.update(updateData);
      console.log(`Migrated ${doc} ${doc.name} in Compendium ${pack.collection}`);
    }

    // Handle migration failures
    catch(err) {
      err.message = `Failed dnd5e system migration for ${doc.name} in pack ${pack.collection}: ${err.message}`;
      console.error(err);
    }
  }

  // Apply the original locked status for the pack
  await pack.configure({locked: wasLocked});
  console.log(`Migrated all ${doc} entities from Compendium ${pack.collection}`);
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

  if (actorData.abilities.strength.hasOwnProperty('effective')) {
    updateData['system.abilities.strength.-=effective'] = null
  }

  if (actorData.abilities.stamina.hasOwnProperty('effective')) {
    updateData['system.abilities.stamina.-=effective'] = null
  }

  if (actorData.abilities.dexterity.hasOwnProperty('effective')) {
    updateData['system.abilities.dexterity.-=effective'] = null
  }

  if (actorData.abilities.agility.hasOwnProperty('effective')) {
    updateData['system.abilities.agility.-=effective'] = null
  }

  if (actorData.abilities.intelligence.hasOwnProperty('effective')) {
    updateData['system.abilities.intelligence.-=effective'] = null
  }

  if (actorData.abilities.aura.hasOwnProperty('effective')) {
    updateData['system.abilities.aura.-=effective'] = null
  }

  if (actorData.abilities.will.hasOwnProperty('effective')) {
    updateData['system.abilities.will.-=effective'] = null
  }

  if (actorData.abilities.eyesight.hasOwnProperty('effective')) {
    updateData['system.abilities.eyesight.-=effective'] = null
  }

  if (actorData.abilities.hearing.hasOwnProperty('effective')) {
    updateData['system.abilities.hearing.-=effective'] = null
  }

  if (actorData.abilities.smell.hasOwnProperty('effective')) {
    updateData['system.abilities.smell.-=effective'] = null
  }

  if (actorData.abilities.voice.hasOwnProperty('effective')) {
    updateData['system.abilities.voice.-=effective'] = null
  }

  if (actorData.abilities.hasOwnProperty('comliness')) {
    // Rename 'comliness' to 'comeliness'
    updateData['system.abilities.comeliness.base'] = actorData.abilities.comliness.base;
    updateData['system.abilities.-=comliness'] = null;
  }

  if (actorData.abilities.morality.hasOwnProperty('effective')) {
    updateData['system.abilities.morality.-=effective'] = null
  }

  if (actorData.abilities.hasOwnProperty('endurance')) {
    if (actorData.abilities.endurance.base) {
      updateData['flags.hm-gold.ability-endurance'] = actorData.abilities.endurance.base;
    }
    updateData['system.abilities.-=endurance'] = null;
  }

  if (actorData.abilities.hasOwnProperty('speed')) {
    if (actorData.abilities.speed.base) {
      updateData['flags.hm-gold.ability-speed'] = actorData.abilities.speed.base;
    }
    updateData['system.abilities.-=speed'] = null;
  }

  if (actorData.abilities.hasOwnProperty('touch')) {
    if (actorData.abilities.touch.base) {
      updateData['flags.hm-gold.ability-touch'] = actorData.abilities.touch.base;
    }
    updateData['system.abilities.-=touch'] = null;
  }

  if (actorData.abilities.hasOwnProperty('frame')) {
    if (actorData.abilities.frame.base) {
      updateData['flags.hm-gold.ability-frame'] = actorData.abilities.frame.base;
    }
    updateData['system.abilities.-=frame'] = null;
  }

  // if (actorData.hasOwnProperty('shockIndex')) {
  //   updateData['system.-=shockIndex'] = null
  // }

  if (actorData.hasOwnProperty('dodge')) {
    updateData['system.-=dodge'] = null
  }

  if (actorData.hasOwnProperty('initiative')) {
    updateData['system.-=initiative'] = null
  }

  if (actorData.hasOwnProperty('endurance')) {
    updateData['system.-=endurance'] = null
  }

  if (actorData.move.hasOwnProperty('effective')) {
    updateData['system.move.-=effective'] = null
  }

  if (actorData.hasOwnProperty('universalPenalty')) {
    updateData['system.-=universalPenalty'] = null
  }

  if (actorData.hasOwnProperty('physicalPenalty')) {
    updateData['system.-=physicalPenalty'] = null
  }

  if (actorData.hasOwnProperty('totalInjuryLevels')) {
    updateData['system.-=totalInjuryLevels'] = null
  }

  if (actorData.hasOwnProperty('hasCondition')) {
    updateData['system.-=hasCondition'] = null
  }

  if (actorData.hasOwnProperty('encumbrance')) {
    updateData['system.-=encumbrance'] = null
  }

  if (actorData.hasOwnProperty('totalWeight')) {
    updateData['system.-=totalWeight'] = null
  }

  if (!actorData.hasOwnProperty('macros') || !actorData.macros.hasOwnProperty('type')) {
    updateData['system.macros.command'] = '';
    updateData['system.macros.type'] = 'script';
  }

  // Remove deprecated fields
  _migrateRemoveDeprecated(actor, updateData);

  // Migrate Owned Items
  if (!actor.items) return updateData;

  if ( !actor.items ) return updateData;
  const items = actor.items.reduce((arr, i) => {
    // Migrate the Owned Item
    const itemData = i instanceof CONFIG.Item.documentClass ? i.toObject() : i;
    let itemUpdate = migrateItemData(itemData);

    // Update the Owned Item
    if ( !foundry.utils.isEmpty(itemUpdate) ) {
      itemUpdate._id = itemData._id;
      arr.push(foundry.utils.expandObject(itemUpdate));
    }

    return arr;
  }, []);
  if ( items.length > 0 ) updateData.items = items;
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
  if (!item.system.macros?.hasOwnProperty('type')) {
    updateData['system.macros.command'] = '';
    updateData['system.macros.type'] = 'script';
  }

  if (item.type === 'weapongear') {
    if (item.system.hasOwnProperty('squeeze')) {
      if (item.system.squeeze) {
        updateData['flags.hm-gold.squeeze-impact'] = item.system.squeeze;
      }
      updateData['system.-=squeeze'] = null;
    }

    if (item.system.hasOwnProperty('tear')) {
      if (item.system.squeeze) {
        updateData['flags.hm-gold.tear-impact'] = item.system.tear;
      }
      updateData['system.-=tear'] = null;
    }
  }

  if (item.type === 'missilegear') {
    if (item.system.range.hasOwnProperty('extreme64')) {
      updateData['system.range.-=extreme64'] = null;
    }

    if (item.system.range.hasOwnProperty('extreme128')) {
      updateData['system.range.-=extreme128'] = null;
    }

    if (item.system.range.hasOwnProperty('extreme256')) {
      updateData['system.range.-=extreme256'] = null;
    }

    if (item.system.impact.hasOwnProperty('extreme64')) {
      if (item.system.impact.extreme64) {
        updateData['flags.hm-gold.range4-impact'] = item.system.impact.short;
        updateData['flags.hm-gold.range8-impact'] = item.system.impact.medium;
        updateData['flags.hm-gold.range16-impact'] = item.system.impact.long;
        updateData['flags.hm-gold.range32-impact'] = item.system.impact.extreme;
        updateData['flags.hm-gold.range64-impact'] = item.system.impact.extreme64;
      }
      updateData['system.impact.-=extreme64'] = null;
    }
  
    if (item.system.impact.hasOwnProperty('extreme128')) {
      if (item.system.impact.extreme128) {
        updateData['flags.hm-gold.range128-impact'] = item.system.impact.extreme128;
      }
      updateData['system.impact.-=extreme128'] = null;
    }

    if (item.system.impact.hasOwnProperty('extreme256')) {
      if (item.system.impact.extreme256) {
        updateData['flags.hm-gold.range256-impact'] = item.system.impact.extreme256;
      }
      updateData['system.impact.-=extreme256'] = null;
    }  
  }

  if (item.type === 'armorgear') {
    if (!item.system.protection.hasOwnProperty('squeeze')) {
      if (item.system.protection.squeeze) {
        updateData['flags.hm-gold.squeeze'] = item.system.protection.squeeze;
      }
      updateData['system.protection.-=squeeze'] = null;
    }

    if (item.system.protection.hasOwnProperty('tear')) {
      if (item.system.protection.tear) {
        updateData['flags.hm-gold.tear'] = item.system.protection.tear;
      }
      updateData['system.protection.-=tear'] = null;
    }
  }

  if (item.type === 'armorlocation') {
    if (item.system.hasOwnProperty('squeeze')) {
      if (item.system.squeeze) {
        updateData['flags.hm-gold.squeeze'] = item.system.squeeze;
      }      
      updateData['system.-=squeeze'] = null;
    }

    if (item.system.hasOwnProperty('tear')) {
      if (item.system.tear) {
        updateData['flags.hm-gold.tear'] = item.system.tear;
      }
      updateData['system.-=tear'] = null;
    }

    if (item.system.probWeight.hasOwnProperty('arms')) {
      if (item.system.probWeight.arms) {
        updateData['flags.hm-gold.probweight-arms'] = item.system.probWeight.arms;
      }
      updateData['system.probWeight.-=arms'] = null;
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
 export const migrateSceneData = function(scene) {
  const tokens = scene.tokens.map(token => {
    const t = token.toJSON();
    if (!t.actorId || t.actorLink) {
      t.actorData = {};
    }
    else if ( !game.actors.has(t.actorId) ){
      t.actorId = null;
      t.actorData = {};
    }
    else if ( !t.actorLink ) {
      const actorData = foundry.utils.duplicate(t.actorData);
      actorData.type = token.actor?.type;
      const update = migrateActorData(actorData);
      ['items', 'effects'].forEach(embeddedName => {
        if (!update[embeddedName]?.length) return;
        const updates = new Map(update[embeddedName].map(u => [u._id, u]));
        t.actorData[embeddedName].forEach(original => {
          const update = updates.get(original._id);
          if (update) foundry.utils.mergeObject(original, update);
        });
        delete update[embeddedName];
      });

      foundry.utils.mergeObject(t.actorData, update);
    }
    return t;
  });
  return {tokens};
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

  const toPreDep = Object.entries(updateData).filter(e => e[0])
  // Identify objects to deprecate
  const toDeprecate = Object.entries(flat).filter(e => e[0].endsWith("_deprecated") && (e[1] === true)).map(e => {
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
      update.items = doc.items.map(i => {
        i.flags = cleanFlags(i.flags);
        return i;
      });
    }
    await doc.update(update, { recursive: false });
    console.log(`HM3 | Purged flags from ${doc.name}`);
  }
  await pack.configure({ locked: true });
}
