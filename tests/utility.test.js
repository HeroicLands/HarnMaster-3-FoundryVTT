import { describe, it, expect } from "vitest";
import {
    romanize,
    createUniqueName,
    stringReplacer,
    parseAEValue,
    getAssocSkill,
} from "../module/utility.js";

describe("romanize", () => {
    it("converts single digits", () => {
        expect(romanize(1)).toBe("I");
        expect(romanize(4)).toBe("IV");
        expect(romanize(5)).toBe("V");
        expect(romanize(9)).toBe("IX");
    });

    it("converts tens", () => {
        expect(romanize(10)).toBe("X");
        expect(romanize(40)).toBe("XL");
        expect(romanize(50)).toBe("L");
        expect(romanize(90)).toBe("XC");
    });

    it("converts hundreds", () => {
        expect(romanize(100)).toBe("C");
        expect(romanize(400)).toBe("CD");
        expect(romanize(500)).toBe("D");
        expect(romanize(900)).toBe("CM");
    });

    it("converts compound numbers", () => {
        expect(romanize(14)).toBe("XIV");
        expect(romanize(42)).toBe("XLII");
        expect(romanize(1999)).toBe("MCMXCIX");
        expect(romanize(2024)).toBe("MMXXIV");
    });

    it("returns NaN for non-numeric input", () => {
        expect(romanize("abc")).toBeNaN();
        expect(romanize(NaN)).toBeNaN();
    });
});

describe("createUniqueName", () => {
    it("returns prefix when no conflicts", () => {
        expect(createUniqueName("Sword", [])).toBe("Sword");
    });

    it("appends -1 when exact name exists", () => {
        const items = [{ name: "Sword" }];
        expect(createUniqueName("Sword", items)).toBe("Sword-1");
    });

    it("increments beyond existing numbered names", () => {
        const items = [{ name: "Sword" }, { name: "Sword-1" }, { name: "Sword-2" }];
        expect(createUniqueName("Sword", items)).toBe("Sword-3");
    });

    it("handles gaps in numbering", () => {
        const items = [{ name: "Sword" }, { name: "Sword-5" }];
        expect(createUniqueName("Sword", items)).toBe("Sword-6");
    });

    it("ignores unrelated items", () => {
        const items = [{ name: "Shield" }, { name: "Dagger-2" }];
        expect(createUniqueName("Sword", items)).toBe("Sword");
    });
});

describe("parseAEValue", () => {
    it("returns array with single element when no colon", () => {
        expect(parseAEValue("hello")).toEqual(["hello"]);
    });

    it("splits on last colon", () => {
        expect(parseAEValue("key:value")).toEqual(["key", "value"]);
    });

    it("splits on last colon when multiple colons present", () => {
        expect(parseAEValue("a:b:c")).toEqual(["a:b", "c"]);
    });

    it("trims whitespace", () => {
        expect(parseAEValue("key : value")).toEqual(["key", "value"]);
    });
});

describe("getAssocSkill", () => {
    // Shaped like real Items: `name` on the document. The fixture this
    // replaced used `{data: {name}}`, the pre-v11 shape, which is what let
    // the `s.data.name` bug in getAssocSkill survive being tested.
    const skills = [{ name: "Sword" }, { name: "Shield" }, { name: "Riding" }];

    it("returns exact match", () => {
        expect(getAssocSkill("Sword", skills, "default")).toBe("Sword");
    });

    it("matches case-insensitively", () => {
        expect(getAssocSkill("sword", skills, "default")).toBe("Sword");
    });

    it("returns default when no match", () => {
        expect(getAssocSkill("Axe", skills, "default")).toBe("default");
    });

    it("returns default for null/empty input", () => {
        expect(getAssocSkill(null, skills, "default")).toBe("default");
        expect(getAssocSkill("", skills, "default")).toBe("default");
    });

    it("returns default for empty skills array", () => {
        expect(getAssocSkill("Sword", [], "default")).toBe("default");
    });

    it("matches sub-skill in square brackets", () => {
        expect(getAssocSkill("Broadsword [Sword]", skills, "default")).toBe("Sword");
    });
});
