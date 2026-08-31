/**
 * Actor data models.
 *
 * These reproduce the `Actor` half of the old `template.json` exactly: the same
 * fields, the same defaults, the same inheritance. `template.json` declared one
 * shared template, `base`, which `character` and `creature` included and
 * `container` deliberately did not — so `container` has no abilities, no
 * shockIndex and no biography, and `HarnMasterActor#prepareBaseData` returns
 * early for it before touching any of them.
 *
 * Derived values are still assigned onto the model at prepare time
 * (`system.eph`, `system.dodge`, `abilities.*.effective`, and so on). That
 * remains correct under a DataModel: undeclared properties live on the instance
 * but are not part of the schema, so they are never written back — which is what
 * the "not in the data model so it will not be saved" comment in
 * `prepareBaseData` has always relied on.
 */

const fields = foundry.data.fields;

/**
 * The `base` Actor template: everything a character and a creature share.
 */
export class ActorBaseModel extends foundry.abstract.TypeDataModel {
    /** @override */
    static defineSchema() {
        return {
            bioImage: new fields.StringField({
                required: true,
                blank: true,
                initial: "systems/hm3/images/svg/knight-silhouette.svg",
            }),
            species: new fields.StringField({ required: true, blank: true, initial: "" }),
            fatigue: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            sunsign: new fields.StringField({ required: true, blank: true, initial: "" }),
            // Written out rather than generated from a name list. The schema is
            // now read as data by `package-build schema`, and a computed key set
            // reads there as a field with *no* keys beneath it — enough to keep
            // `abilities.strength.base` from being called undeclared, but never
            // enough to catch an ability that is merely misspelt. Thirteen lines
            // buy that check, and the ability list is the kind of thing a reader
            // should be able to see rather than assemble.
            //
            // Only `base` is stored; `effective` and `modified` are computed
            // every prepare cycle and are deliberately not in the schema.
            abilities: new fields.SchemaField({
                strength: new fields.SchemaField({
                    base: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: false,
                        initial: 0,
                    }),
                }),
                stamina: new fields.SchemaField({
                    base: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: false,
                        initial: 0,
                    }),
                }),
                dexterity: new fields.SchemaField({
                    base: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: false,
                        initial: 0,
                    }),
                }),
                agility: new fields.SchemaField({
                    base: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: false,
                        initial: 0,
                    }),
                }),
                intelligence: new fields.SchemaField({
                    base: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: false,
                        initial: 0,
                    }),
                }),
                aura: new fields.SchemaField({
                    base: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: false,
                        initial: 0,
                    }),
                }),
                will: new fields.SchemaField({
                    base: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: false,
                        initial: 0,
                    }),
                }),
                eyesight: new fields.SchemaField({
                    base: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: false,
                        initial: 0,
                    }),
                }),
                hearing: new fields.SchemaField({
                    base: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: false,
                        initial: 0,
                    }),
                }),
                smell: new fields.SchemaField({
                    base: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: false,
                        initial: 0,
                    }),
                }),
                voice: new fields.SchemaField({
                    base: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: false,
                        initial: 0,
                    }),
                }),
                comeliness: new fields.SchemaField({
                    base: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: false,
                        initial: 0,
                    }),
                }),
                morality: new fields.SchemaField({
                    base: new fields.NumberField({
                        required: true,
                        nullable: false,
                        integer: false,
                        initial: 0,
                    }),
                }),
            }),
            move: new fields.SchemaField({
                base: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            }),
            shockIndex: new fields.SchemaField({
                max: new fields.NumberField({ required: true, nullable: false, initial: 100 }),
                value: new fields.NumberField({ required: true, nullable: false, initial: 100 }),
            }),
            // "***INIT***" is a sentinel the actor-creation flow looks for; it is
            // not a placeholder left behind by mistake.
            description: new fields.HTMLField({
                required: true,
                blank: true,
                initial: "***INIT***",
            }),
            biography: new fields.HTMLField({ required: true, blank: true, initial: "" }),
            macros: new fields.SchemaField({
                type: new fields.StringField({ required: true, blank: false, initial: "script" }),
                command: new fields.StringField({ required: true, blank: true, initial: "" }),
            }),
        };
    }
}

/**
 * A player character.
 */
export class CharacterModel extends ActorBaseModel {
    /** @override */
    static defineSchema() {
        return Object.assign(super.defineSchema(), {
            gender: new fields.StringField({ required: true, blank: true, initial: "" }),
            occupation: new fields.StringField({ required: true, blank: true, initial: "" }),
        });
    }
}

/**
 * A creature.
 */
export class CreatureModel extends ActorBaseModel {
    /** @override */
    static defineSchema() {
        return Object.assign(super.defineSchema(), {
            loadRating: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        });
    }
}

/**
 * A container actor — a chest, a cart, a packhorse.
 *
 * It does not extend {@link ActorBaseModel}: `template.json` gave it
 * `"templates": []`, so it has never carried abilities or a shockIndex. It also
 * declared `"macros": {}` with no subfields, which is reproduced here as an
 * empty schema rather than being quietly upgraded to the standard shape.
 */
export class ContainerModel extends foundry.abstract.TypeDataModel {
    /** @override */
    static defineSchema() {
        return {
            bioImage: new fields.StringField({
                required: true,
                blank: true,
                initial: "systems/hm3/images/icons/svg/chest.svg",
            }),
            description: new fields.HTMLField({ required: true, blank: true, initial: "" }),
            macros: new fields.SchemaField({}),
            capacity: new fields.SchemaField({
                max: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            }),
        };
    }
}

export const actorModels = {
    character: CharacterModel,
    creature: CreatureModel,
    container: ContainerModel,
};
