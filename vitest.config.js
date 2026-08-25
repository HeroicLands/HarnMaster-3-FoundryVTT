import { defineConfig } from "vitest/config";

/**
 * Unit tests for the parts of the system that do not need Foundry.
 *
 * `environment: "node"` is deliberate: nothing here touches the DOM or a
 * `game` global. These specs cover pure functions — the combat result tables,
 * the utility helpers, the shape of `CONFIG.HM3` — so they run in milliseconds
 * and can be trusted to fail for a reason rather than because a browser stub
 * drifted. Anything that needs a real Foundry belongs in the end-to-end suite.
 */
export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["tests/**/*.test.js"],
        coverage: {
            reporter: ["text", "html"],
            include: ["module/**/*.js"],
            // The entry point is all Hooks registration and CONFIG assignment;
            // there is nothing in it to unit test.
            exclude: ["module/hm3.js"],
        },
    },
});
