/*
 * Copyright (c) 2026 Tom Rodriguez ("Toasty") — <toasty@heroiclands.org>
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const yaml = createRequire(import.meta.resolve("@heroiclands/package-build/package.json"))("yaml");
const spec = {
    file: "build.yml",
    gated: ["build"],
    light: "content-lint",
    runs: ["npm run lint:format", "npm run lint:markdown", "npm run lint:lang", "npm test"],
    dependency: "content-lint",
    e2e: true,
    test: "utils/wip-workflows.test.mjs",
    required: [
        "Build / Build (pull_request)",
        "Build / Content lint (pull_request)",
        "Build / No compiled packs committed (pull_request)",
        "No Attribution / No AI attribution (pull_request)",
    ],
    lightActions: ["HeroicLands/.github/actions/no-attribution"],
};
const workflows = Object.fromEntries(
    fs
        .readdirSync(".gitea/workflows")
        .filter((name) => name.endsWith(".yml"))
        .map((name) => [
            name,
            yaml.parse(fs.readFileSync(path.join(".gitea/workflows", name), "utf8")),
        ]),
);
const workflow = workflows[spec.file];
const jobs = workflow.jobs;

// Evaluate the job and step condition surface used here, including Gitea's
// implicit success() and case-insensitive startsWith().
function condition(
    expression,
    {
        title,
        event = "pull_request",
        results = {},
        steps = {},
        success = true,
        cancelled = false,
    } = {},
) {
    const source = String(expression ?? "success()").replace(/^\$\{\{\s*|\s*\}\}$/g, "");
    if (!/\b(?:always|cancelled|success|failure)\(/.test(source) && !success) return false;
    const needs = Object.fromEntries(
        Object.entries(results).map(([id, result]) => [id, { result, outputs: { run: "true" } }]),
    );
    return Function(
        "github",
        "needs",
        "steps",
        "startsWith",
        "cancelled",
        "success",
        "failure",
        "always",
        `return (${source});`,
    )(
        { event_name: event, event: { pull_request: { title } } },
        needs,
        steps,
        (value, prefix) =>
            String(value ?? "")
                .toLowerCase()
                .startsWith(prefix.toLowerCase()),
        () => cancelled,
        () => success,
        () => !success && !cancelled,
        () => true,
    );
}
function enabled(job, title, event = "pull_request", results = {}, cancelled = false) {
    const dependencies = [job.needs ?? []].flat();
    const all = Object.fromEntries(dependencies.map((id) => [id, results[id] ?? "success"]));
    return condition(job.if, {
        title,
        event,
        results: all,
        cancelled,
        success: Object.values(all).every((result) => result === "success"),
    });
}
function shell(run, env = {}) {
    const localEnv = { ...process.env };
    delete localEnv.PR_TITLE;
    delete localEnv.LIGHT_RESULT;
    return spawnSync("bash", ["-e", "-o", "pipefail", "-c", run], { env: { ...localEnv, ...env } })
        .status;
}
const requiredJobs = Object.entries(jobs).filter(([id, job]) =>
    spec.required.includes(`${workflow.name} / ${job.name ?? id} (pull_request)`),
);

test("a required merge gate runs and fails on WIP instead of satisfying branch protection", () => {
    const gates = requiredJobs.filter(([, job]) => enabled(job, "WIP: work"));
    const blockers = gates.filter(
        ([, job]) => job.steps?.[0]?.name === "Require a ready pull request",
    );
    assert.ok(
        blockers.length,
        "all required checks were satisfied or skipped without a WIP blocker",
    );
    for (const [, job] of blockers) {
        assert.doesNotMatch(job.if ?? "", /startsWith/);
        const guard = job.steps[0];
        assert.notEqual(job["continue-on-error"], true);
        assert.notEqual(guard["continue-on-error"], true);
        assert.equal(condition(guard.if, { title: "WIP: work" }), true);
        for (const result of ["success", "failure", "cancelled", "skipped"]) {
            const results = Object.fromEntries([job.needs ?? []].flat().map((id) => [id, result]));
            assert.equal(enabled(job, "WIP: work", "pull_request", results), true);
        }
        assert.equal(guard.env.PR_TITLE, "${{ github.event.pull_request.title }}");
        assert.ok(
            !guard.run.includes("${{ github.event.pull_request.title }}"),
            "titles must be passed through env",
        );
        assert.equal(shell(guard.run), 0, "raw local replay");
        for (const title of ["WIP: work", "wip: work", "WIP: $(exit 7)"])
            assert.equal(shell(guard.run, { PR_TITLE: title }), 1);
        assert.equal(shell(guard.run, { PR_TITLE: "Ready $(exit 7)" }), 0);
    }
});

test("every expensive job or step skips WIP while ready and non-PR work remains applicable", () => {
    const heavy = [
        ...spec.gated.map((id) => jobs[id]),
        ...(spec.e2e ? [workflows["e2e-full.yml"].jobs["full-e2e"]] : []),
    ];
    // Also derive the compile and reusable-e2e surface from the workflows.
    for (const current of Object.values(workflows)) {
        if (!Object.hasOwn(current.on ?? {}, "pull_request")) continue;
        for (const job of Object.values(current.jobs ?? {}))
            if (
                ["build", "ubuntu-vm"].includes(job["runs-on"]) ||
                /\/workflows\/e2e-full\.yml@/.test(job.uses ?? "")
            )
                if (!heavy.includes(job)) heavy.push(job);
    }
    for (const job of heavy) {
        assert.ok(job);
        assert.equal(enabled(job, "Ready work"), true, job.name);
        for (const event of ["push", "schedule", "workflow_dispatch"])
            assert.equal(enabled(job, undefined, event), true, `${job.name}: ${event}`);
        if (!enabled(job, "WIP: work")) continue;
        assert.equal(job.steps[0].name, "Require a ready pull request");
        const outcomes = Object.fromEntries(
            job.steps.filter((step) => step.id).map((step) => [step.id, { outcome: "success" }]),
        );
        for (const step of job.steps.slice(1)) {
            assert.match(step.if ?? "", /startsWith.*WIP:/, step.name ?? step.uses);
            assert.equal(
                condition(step.if, { title: "WIP: work", steps: outcomes }),
                false,
                step.name ?? step.uses,
            );
        }
    }
});
test("light checks, attribution and changeset review remain independent on WIP", () => {
    const light = Object.values(workflows)
        .flatMap((w) => Object.values(w.jobs ?? {}))
        .filter((job) => !String(job.if ?? "").includes("startsWith"));
    const steps = light.flatMap((job) => job.steps ?? []);
    for (const run of spec.runs)
        assert.ok(
            steps.some((step) => step.run === run || step.run?.includes(`${run}\n`)),
            `missing light command: ${run}`,
        );
    for (const action of spec.lightActions)
        assert.ok(
            steps.some((step) => step.uses?.split("@")[0] === action),
            `missing light action: ${action}`,
        );
    assert.equal(enabled(jobs[spec.light], "WIP: work"), true);
    assert.ok(![jobs[spec.light].needs ?? []].flat().some((id) => spec.gated.includes(id)));
    for (const file of [spec.file, ...(spec.e2e ? ["e2e-full.yml"] : [])])
        assert.ok(!workflows[file].on.pull_request?.types?.includes("edited"), file);
});

test("protected status context names retain their exact spelling", () => {
    const names = Object.values(workflows).flatMap((w) =>
        Object.entries(w.jobs ?? {}).map(
            ([id, job]) => `${w.name} / ${job.name ?? id} (pull_request)`,
        ),
    );
    for (const required of spec.required) assert.ok(names.includes(required), required);
});

if (spec.dependency)
    test("light dependency results fail closed without breaking raw local replay", () => {
        for (const id of spec.gated) {
            const job = jobs[id];
            assert.ok([job.needs ?? []].flat().includes(spec.dependency));
            const check = job.steps.find((step) => step.name === "Require light checks");
            assert.ok(check, id);
            assert.equal(shell(check.run), 0);
            assert.equal(check.env?.LIGHT_RESULT, `\${{ needs.${spec.dependency}.result }}`);
            for (const result of ["success", "failure", "cancelled", "skipped", ""]) {
                assert.equal(
                    enabled(job, "Ready", "pull_request", { [spec.dependency]: result }),
                    true,
                );
                assert.equal(
                    shell(check.run, { LIGHT_RESULT: result }),
                    result === "success" ? 0 : 1,
                );
                const outcomes = {
                    ready: { outcome: "success" },
                    light_checks: { outcome: result === "success" ? "success" : "failure" },
                };
                for (const step of job.steps.filter(
                    (entry) =>
                        !["Require a ready pull request", "Require light checks"].includes(
                            entry.name,
                        ),
                ))
                    assert.equal(
                        condition(step.if, { title: "Ready", steps: outcomes }),
                        result === "success",
                        step.name ?? step.uses,
                    );
            }
            assert.equal(enabled(job, "Ready", "pull_request", {}, true), false);
        }
    });
