import { describe, it, expect } from "vitest";
import { facadeArtSrc } from "../module/facade-art.js";

const actor = (bioImage, visible = true) => ({ visible, system: { bioImage } });

describe("facadeArtSrc", () => {
    it("returns the façade image of a visible actor", () => {
        expect(facadeArtSrc(actor("worlds/x/face.webp"))).toBe("worlds/x/face.webp");
    });

    it("returns undefined when the façade image is blank", () => {
        expect(facadeArtSrc(actor(""))).toBeUndefined();
        expect(facadeArtSrc(actor("   "))).toBeUndefined();
    });

    it("returns undefined when the user cannot see the actor", () => {
        expect(facadeArtSrc(actor("worlds/x/face.webp", false))).toBeUndefined();
    });

    it("returns undefined for each default silhouette", () => {
        for (const src of [
            "systems/hm3/images/svg/knight-silhouette.svg",
            "systems/hm3/images/svg/monster-silhouette.svg",
            "systems/hm3/images/icons/svg/chest.svg",
        ]) {
            expect(facadeArtSrc(actor(src))).toBeUndefined();
        }
    });

    it("returns undefined for a missing actor or missing system data", () => {
        expect(facadeArtSrc(undefined)).toBeUndefined();
        expect(facadeArtSrc({ visible: true })).toBeUndefined();
        expect(facadeArtSrc({ visible: true, system: {} })).toBeUndefined();
    });
});
