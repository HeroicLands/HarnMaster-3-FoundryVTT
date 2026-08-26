import { defineConfig } from "cypress";
import dotenv from "dotenv";
import { loadPackageBuildConfig } from "@heroiclands/package-build/config";
import { resolveStagePort } from "@heroiclands/package-build/container";
import { resolveE2EWorld } from "@heroiclands/package-build/e2e";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

// The port and the credentials come from the same resolution the harness seeds
// with, so `package-build e2e seed` and this file cannot disagree about which
// world the specs are talking to.
const buildConfig = loadPackageBuildConfig();
const port = resolveStagePort(buildConfig.e2eStage, {
    stages: buildConfig.containerStages,
});
const { worldId, gmId, gmName, gmPassword } = resolveE2EWorld(buildConfig);

export default defineConfig({
    e2e: {
        baseUrl: `http://localhost:${port}`,
        supportFile: "cypress/support/e2e.js",
        specPattern: "cypress/e2e/**/*.cy.js",
        // Specs log in once and keep the session across their tests. The
        // default would reload to about:blank between tests, dropping `game`
        // and the login with it. Isolation between spec *files* still holds.
        testIsolation: false,
        // Foundry is a live server driven through a browser; there are no
        // fixtures to load from disk here, and videos cost more than they say.
        fixturesFolder: false,
        video: false,
        // Everything a spec needs to reach the seeded world, so no spec has to
        // hard-code a credential.
        env: { worldId, gmId, gmName, gmPassword },
    },
});
