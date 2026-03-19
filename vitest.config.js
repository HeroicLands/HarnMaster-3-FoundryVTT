import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    resolve: {
        alias: {
            "@module": path.resolve(import.meta.dirname, "module"),
        },
    },
    test: {
        globals: true,
        environment: "node",
        include: ["tests/**/*.test.js"],
        coverage: {
            reporter: ["text", "html"],
            include: ["module/**/*.js"],
            exclude: ["module/hm3.js"],
        },
    },
});
