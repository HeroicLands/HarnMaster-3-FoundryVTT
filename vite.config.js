import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const startYear = 2020;
const currentYear = new Date().getFullYear();
const licenseYears =
    currentYear > startYear ? `${startYear}-${currentYear}` : `${startYear}`;

const licenseBanner = `/*!
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (c) ${licenseYears} by Tom Rodriguez
 */`;

export default defineConfig(() => {
    return {
        root: ".",
        build: {
            outDir: path.resolve(__dirname, "build/stage"),
            emptyOutDir: false,
            target: "es2020",
            sourcemap: true,
            minify: false,
            lib: {
                entry: path.resolve(__dirname, "module/hm3.js"),
                fileName: () => "hm3.js",
                formats: ["es"],
            },
            rollupOptions: {
                input: path.resolve(__dirname, "module/hm3.js"),
                output: {
                    entryFileNames: "hm3.js",
                    banner: licenseBanner,
                },
            },
        },
        resolve: {
            extensions: [".js", ".json"],
        },
    };
});
