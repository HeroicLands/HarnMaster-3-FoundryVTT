/**
 * Item data models.
 *
 * These reproduce the `Item` half of the old `template.json` exactly. It carried
 * three shared templates and twelve types; the inheritance below is the same
 * shape, expressed as classes:
 *
 *   ItemBaseModel                     base            skill, spell, invocation,
 *                                                     psionic, injury, trait
 *     └─ GearModel                    base + gear     miscgear, containergear,
 *                                                     armorgear
 *          └─ WeaponModel             base + gear +   weapongear, missilegear
 *                                     weapon
 *
 *   ArmorLocationModel                (no templates)  armorlocation
 *
 * `armorlocation` stands apart because `template.json` gave it `"templates": []`
 * — it has never carried `notes`, `description`, `source` or `macros`, and that
 * is preserved rather than tidied up.
 *
 * Derived values continue to be assigned onto the model during
 * `HarnMasterItem#prepareData` and `#postProcessItems`. Properties that are not
 * in the schema live on the instance and are never persisted, which is the same
 * contract these models replace.
 */

const fields = foundry.data.fields;

/**
 * The `base` Item template.
 */
export class ItemBaseModel extends foundry.abstract.TypeDataModel {
    /** @override */
    static defineSchema() {
        return {
            notes: new fields.StringField({ required: true, blank: true, initial: "" }),
            description: new fields.HTMLField({ required: true, blank: true, initial: "" }),
            source: new fields.StringField({ required: true, blank: true, initial: "" }),
            macros: new fields.SchemaField({
                type: new fields.StringField({ required: true, blank: false, initial: "script" }),
                command: new fields.StringField({ required: true, blank: true, initial: "" }),
            }),
        };
    }
}

/**
 * The `gear` template: anything that can be carried, weighed and stowed.
 */
export class GearModel extends ItemBaseModel {
    /** @override */
    static defineSchema() {
        return Object.assign(super.defineSchema(), {
            quantity: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
            value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            weight: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            isCarried: new fields.BooleanField({ initial: true }),
            isEquipped: new fields.BooleanField({ initial: true }),
            container: new fields.StringField({
                required: true,
                blank: true,
                initial: "on-person",
            }),
            arcane: new fields.SchemaField({
                isArtifact: new fields.BooleanField({ initial: false }),
                isAttuned: new fields.BooleanField({ initial: false }),
                // -1 means "not a charged item", not "no charges left".
                charges: new fields.NumberField({ required: true, nullable: false, initial: -1 }),
                ego: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            }),
        });
    }
}

/**
 * The `weapon` template, layered on top of `gear`.
 */
export class WeaponModel extends GearModel {
    /** @override */
    static defineSchema() {
        return Object.assign(super.defineSchema(), {
            assocSkill: new fields.StringField({ required: true, blank: true, initial: "None" }),
            weaponQuality: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            attackMasteryLevel: new fields.NumberField({
                required: true,
                nullable: false,
                initial: 0,
            }),
        });
    }
}

/* -------------------------------------------- */
/*  Concrete types                              */
/* -------------------------------------------- */

export class SkillModel extends ItemBaseModel {
    /** @override */
    static defineSchema() {
        return Object.assign(super.defineSchema(), {
            type: new fields.StringField({ required: true, blank: true, initial: "Craft" }),
            // A rolled value plus the formula it came from. Written out rather
            // than shared through a helper: the schema is read as data by
            // `package-build schema`, which follows the declaration and not a
            // function call, and content authors `skillBase.value` directly.
            skillBase: new fields.SchemaField({
                value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
                formula: new fields.StringField({ required: true, blank: true, initial: "" }),
                isFormulaValid: new fields.BooleanField({ initial: true }),
            }),
            masteryLevel: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            effectiveMasteryLevel: new fields.NumberField({
                required: true,
                nullable: false,
                initial: 0,
            }),
            ritual: new fields.SchemaField({
                piety: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            }),
            improveFlag: new fields.BooleanField({ initial: false }),
        });
    }
}

export class SpellModel extends ItemBaseModel {
    /** @override */
    static defineSchema() {
        return Object.assign(super.defineSchema(), {
            convocation: new fields.StringField({ required: true, blank: true, initial: "" }),
            level: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
            effectiveMasteryLevel: new fields.NumberField({
                required: true,
                nullable: false,
                initial: 0,
            }),
        });
    }
}

export class InvocationModel extends ItemBaseModel {
    /** @override */
    static defineSchema() {
        return Object.assign(super.defineSchema(), {
            // Spelled "diety" in the stored data since the system's first
            // release. Renaming it is a data migration, not a typo fix.
            diety: new fields.StringField({ required: true, blank: true, initial: "" }),
            circle: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
            effectiveMasteryLevel: new fields.NumberField({
                required: true,
                nullable: false,
                initial: 0,
            }),
        });
    }
}

export class PsionicModel extends ItemBaseModel {
    /** @override */
    static defineSchema() {
        return Object.assign(super.defineSchema(), {
            // A rolled value plus the formula it came from. Written out rather
            // than shared through a helper: the schema is read as data by
            // `package-build schema`, which follows the declaration and not a
            // function call, and content authors `skillBase.value` directly.
            skillBase: new fields.SchemaField({
                value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
                formula: new fields.StringField({ required: true, blank: true, initial: "" }),
                isFormulaValid: new fields.BooleanField({ initial: true }),
            }),
            masteryLevel: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            effectiveMasteryLevel: new fields.NumberField({
                required: true,
                nullable: false,
                initial: 0,
            }),
            improveFlag: new fields.BooleanField({ initial: false }),
            fatigue: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        });
    }
}

export class WeaponGearModel extends WeaponModel {
    /** @override */
    static defineSchema() {
        return Object.assign(super.defineSchema(), {
            attack: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            defense: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            attackModifier: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            blunt: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            edged: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            piercing: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            defenseMasteryLevel: new fields.NumberField({
                required: true,
                nullable: false,
                initial: 0,
            }),
        });
    }
}

export class MissileGearModel extends WeaponModel {
    /** @override */
    static defineSchema() {
        const band = () =>
            new fields.SchemaField({
                short: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
                medium: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
                long: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
                extreme: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            });
        return Object.assign(super.defineSchema(), {
            weaponAspect: new fields.StringField({
                required: true,
                blank: true,
                initial: "Piercing",
            }),
            attackModifier: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            range: band(),
            impact: band(),
        });
    }
}

export class ArmorGearModel extends GearModel {
    /** @override */
    static defineSchema() {
        return Object.assign(super.defineSchema(), {
            material: new fields.StringField({ required: true, blank: true, initial: "" }),
            armorQuality: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            locations: new fields.ArrayField(
                new fields.StringField({ required: true, blank: true }),
                { required: true, initial: [] },
            ),
            protection: new fields.SchemaField({
                blunt: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
                edged: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
                piercing: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
                fire: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            }),
            size: new fields.NumberField({ required: true, nullable: false, initial: 6 }),
        });
    }
}

export class MiscGearModel extends GearModel {}

export class ContainerGearModel extends GearModel {
    /** @override */
    static defineSchema() {
        return Object.assign(super.defineSchema(), {
            capacity: new fields.SchemaField({
                max: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
                value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            }),
        });
    }
}

export class InjuryModel extends ItemBaseModel {
    /** @override */
    static defineSchema() {
        return Object.assign(super.defineSchema(), {
            healRate: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            injuryLevel: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            severity: new fields.StringField({ required: true, blank: true, initial: "" }),
        });
    }
}

export class TraitModel extends ItemBaseModel {
    /** @override */
    static defineSchema() {
        return Object.assign(super.defineSchema(), {
            type: new fields.StringField({ required: true, blank: true, initial: "Physical" }),
        });
    }
}

/**
 * A hit location on an armour diagram.
 *
 * Extends {@link foundry.abstract.TypeDataModel} directly: `template.json` gave
 * this type `"templates": []`, so unlike every other Item it carries no `notes`,
 * `description`, `source` or `macros`.
 */
export class ArmorLocationModel extends foundry.abstract.TypeDataModel {
    /** @override */
    static defineSchema() {
        return {
            layers: new fields.StringField({ required: true, blank: true, initial: "" }),
            armorQuality: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            blunt: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            edged: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            piercing: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            fire: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
            isFumble: new fields.BooleanField({ initial: false }),
            isStumble: new fields.BooleanField({ initial: false }),
            isAmputate: new fields.BooleanField({ initial: false }),
            impactType: new fields.StringField({ required: true, blank: true, initial: "custom" }),
            effectiveImpact: new fields.SchemaField({
                ei1: new fields.StringField({ required: true, blank: true, initial: "M1" }),
                ei5: new fields.StringField({ required: true, blank: true, initial: "S2" }),
                ei9: new fields.StringField({ required: true, blank: true, initial: "S3" }),
                ei13: new fields.StringField({ required: true, blank: true, initial: "G4" }),
                ei17: new fields.StringField({ required: true, blank: true, initial: "G5" }),
            }),
            probWeight: new fields.SchemaField({
                high: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
                mid: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
                low: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
            }),
        };
    }
}

export const itemModels = {
    skill: SkillModel,
    spell: SpellModel,
    invocation: InvocationModel,
    psionic: PsionicModel,
    weapongear: WeaponGearModel,
    containergear: ContainerGearModel,
    missilegear: MissileGearModel,
    armorgear: ArmorGearModel,
    miscgear: MiscGearModel,
    injury: InjuryModel,
    armorlocation: ArmorLocationModel,
    trait: TraitModel,
};
