import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const controlCatalog = JSON.parse(
  readFileSync(new URL("../controls/control-catalog.json", import.meta.url), "utf8"),
);
const releaseGates = readFileSync(
  new URL("../operations/release-gates.md", import.meta.url),
  "utf8",
);

const headingByGate = {
  design: "Gate 0 — Design",
  sandbox: "Gate 1 — Sandbox",
  shadow: "Gate 2 — Shadow",
  canary: "Gate 3 — Canary",
  autonomy: "Gate 4 — Autonomy promotion",
  operations: "Gate 5 — Improve, expand, or retire",
};

function documentedControls(heading) {
  const sectionStart = releaseGates.indexOf(`## ${heading}`);
  assert.notEqual(sectionStart, -1, `missing release-gate heading: ${heading}`);
  const nextSection = releaseGates.indexOf("\n## ", sectionStart + 4);
  const section = releaseGates.slice(
    sectionStart,
    nextSection === -1 ? releaseGates.length : nextSection,
  );
  const match = section.match(/^Controls: (.+)\.$/m);
  assert.ok(match, `missing Controls line under ${heading}`);
  return [...match[1].matchAll(/`([A-Z]{3}-\d{3})`/g)].map((entry) => entry[1]);
}

for (const [gate, heading] of Object.entries(headingByGate)) {
  test(`${heading} mirrors control-catalog release_gates`, () => {
    const expected = controlCatalog.controls
      .filter((control) => control.release_gates.includes(gate))
      .map((control) => control.id)
      .sort();
    const actual = documentedControls(heading).sort();
    assert.deepEqual(actual, expected);
  });
}

test("full-case P95 does not hide slow cases at different stages", () => {
  const nearestRankP95 = (samples) => [...samples].sort((a, b) => a - b)[Math.ceil(samples.length * 0.95) - 1];
  const queue = Array.from({ length: 100 }, (_, i) => i < 4 ? 100 : 10);
  const run = Array.from({ length: 100 }, (_, i) => i >= 4 && i < 8 ? 100 : 10);
  const fullCase = queue.map((wait, i) => wait + run[i]);

  assert.equal(nearestRankP95(queue) + nearestRankP95(run), 20);
  assert.equal(nearestRankP95(fullCase), 110);

  const scorecard = readFileSync(new URL("../operations/slo-scorecard.md", import.meta.url), "utf8");
  assert.match(scorecard, /P95 from the full per-case durations/);
  assert.match(scorecard, /full-case P95 is 110 seconds/);
  assert.match(scorecard, /If an open case has crossed the objective's deadline, count it as over the deadline/);
  assert.match(scorecard, /With zero accepted outcomes, the ratio is unavailable/);
  assert.doesNotMatch(scorecard, /queue_wait_p95\s*\+\s*run_time_p95/);
});

test("worked canary separates concurrent control, containment, and inconclusive evidence", () => {
  assert.match(releaseGates, /No case is sent to both routes for action/);
  assert.match(releaseGates, /prior window is context, not the control/);
  assert.match(releaseGates, /do not replay an uncertain effect/);
  assert.match(releaseGates, /68 candidate cases reached a known deadline result against the planned minimum of 100\. \*\*Hold; do not expand\./);
});
