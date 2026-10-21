import { ART_PATHS } from "./art-paths.js";

/** The images a new character, creature or container is created with. */
const DEFAULT_FACADE_ART = new Set([
    "systems/hm3/images/knightsilhouette.svg",
    "systems/hm3/images/monstersilhouette.svg",
    "systems/hm3/icons/chest.svg",
]);

/**
 * The façade image of an actor, when the current user may see it
 * and it is not one of the default images. A default named by its `images/`
 * path, as a document the world migration has not reached still carries it,
 * is a default too.
 *
 * @param {object|undefined} actor An Actor, or any object with `visible` and `system.bioImage`.
 * @returns {string|undefined} The image path, or undefined when there is nothing to show.
 */
export function facadeArtSrc(actor) {
    if (!actor?.visible) return undefined;
    const src = actor.system?.bioImage;
    if (typeof src !== "string" || src.trim() === "") return undefined;
    if (DEFAULT_FACADE_ART.has(ART_PATHS.get(src) ?? src)) return undefined;
    return src;
}

/**
 * Adds "View Façade Artwork" to the Actors directory context menu. The popout
 * carries Foundry's own "Show Players" control for a GM.
 *
 * @param {ActorDirectory} directory The directory that is building its menu.
 * @param {object[]} menuItems The menu entries; modified in place.
 */
export function addFacadeArtOption(directory, menuItems) {
    const getActor = (li) => directory.collection.get(li.dataset.entryId);
    menuItems.unshift({
        label: "HM3.Actor.ViewFacadeArt",
        icon: "fa-solid fa-image",
        visible: (li) => facadeArtSrc(getActor(li)) !== undefined,
        onClick: (event, li) => {
            const actor = getActor(li);
            const src = facadeArtSrc(actor);
            if (!src) return;
            new foundry.applications.apps.ImagePopout({
                src,
                uuid: actor.uuid,
                window: { title: actor.name },
            }).render({ force: true });
        },
    });
}
