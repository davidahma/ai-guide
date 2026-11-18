import assert from "node:assert/strict";
import { test } from "node:test";
import { makeFixture } from "./mechanism-comparison-fixture.mjs";
import { compareMechanisms, decisionSnapshot } from "./mechanism-comparison.mjs";

const mechanisms = ["baseline", "rule", "fitted"];

test("all three mechanisms compare the same batches under the same reviewer-minute cap", () => {
  const report = compareMechanisms();
  const expectedDates = ["2026-02-01T12:00:00Z", "2026-02-08T12:00:00Z"];
  for (const mechanism of mechanisms) {
    const { minutes, batches } = report[mechanism];
    assert.equal(minutes, 20);
    assert.deepEqual(batches.map(({ at }) => at), expectedDates);
    for (const batch of batches) {
      assert.equal(batch.cap, 10);
      assert.equal(batch.minutes, 10);
      assert.equal(batch.order.length, 6);
      assert.equal(new Set(batch.order).size, 6);
      assert.equal(batch.selected.length, 2);
    }
  }
  assert.deepEqual(report.holdout, { shipments: 12, outcomesKnown: 11, outcomesUnknown: 1, knownLate: 5 });
  assert.deepEqual(mechanisms.map((key) => report[key].knownLateReviewed), [1, 4, 1]);
  assert.deepEqual(mechanisms.map((key) => report[key].unknownOutcomeReviewed), [1, 0, 0]);
  assert.deepEqual(report.missedExample, { id: "FEB01-03", knownLate: true, score: 0.2, rank: 4, reviewed: false });
});

test("holdout outcomes and pre-split labels arriving late cannot change fit or rankings", () => {
  const before = compareMechanisms();
  const fixture = makeFixture();
  fixture.outcomes["TRAIN-13"].late = false;
  fixture.outcomes["FEB01-03"].late = false;
  // The outcome exists in the data export but is not yet known at the evaluation cutoff.
  fixture.outcomes["FEB08-02"] = { late: true, availableAt: "2026-02-16T12:00:00Z" };
  const after = compareMechanisms(fixture);
  assert.equal(before.training.used, 12);
  assert.equal(before.training.excluded, 1);
  assert.deepEqual(before.training.rates, {
    "long/normal": 0.8, "long/disruption": 0.6, "short/normal": 0.4, "short/disruption": 0.2,
  });
  assert.deepEqual(after.training, before.training);
  for (const key of mechanisms) {
    assert.deepEqual(after[key].batches.map(({ order }) => order), before[key].batches.map(({ order }) => order));
  }
  assert.equal(after.holdout.outcomesUnknown, 1);
  assert.equal(after.rule.knownLateReviewed, 3);
  assert.notEqual(after.calibration.brierScore, before.calibration.brierScore);
});

test("a backdated carrier update is excluded if it reached dispatch after the decision", () => {
  const fixture = makeFixture();
  const row = fixture.shipments.find(({ id }) => id === "FEB08-01");
  assert.equal(decisionSnapshot(row).scanDelayMinutes, 90);
  assert.equal(decisionSnapshot(row).carrierDisruption, false);
  const update = row.signals.at(-1);
  update.carrierDisruption = false;
  update.scanDelayMinutes = 0;
  assert.deepEqual(compareMechanisms(fixture), compareMechanisms());
  update.availableAt = row.decisionAt;
  assert.equal(decisionSnapshot(row).scanDelayMinutes, 0);
});

test("a shipment cannot enter a replay batch before it joins the queue", () => {
  const fixture = makeFixture();
  const row = fixture.shipments.find(({ id }) => id === "FEB01-03");
  row.queuedAt = "2026-02-01T12:00:01Z";
  assert.throws(() => compareMechanisms(fixture), /Invalid queue timing for FEB01-03/);
  row.queuedAt = "invalid";
  assert.throws(() => compareMechanisms(fixture), /Invalid queue timing for FEB01-03/);
  row.queuedAt = row.decisionAt;
  assert.ok(compareMechanisms(fixture).rule.batches[0].selected.includes(row.id));
});

test("missing inputs leave a case at its FIFO position and inside the time budget", () => {
  const fixture = makeFixture();
  fixture.shipments.find(({ id }) => id === "FEB01-06").queuedAt = "2026-02-01T09:59:00Z";
  for (const mechanism of ["rule", "fitted"]) {
    const batch = compareMechanisms(fixture)[mechanism].batches[0];
    assert.equal(batch.fallbackInQueue, 1);
    assert.equal(batch.fallbackReviewed, 1);
    assert.equal(batch.selected[0], "FEB01-06");
    assert.equal(batch.selected.length, 2);
    assert.equal(batch.minutes, 10);
  }
});

test("a malformed review duration cannot bypass the minute cap", () => {
  const fixture = makeFixture();
  fixture.shipments.find(({ id }) => id === "FEB01-01").reviewMinutes = -5;
  assert.throws(() => compareMechanisms(fixture), /Invalid review minutes for FEB01-01/);
});

test("calibration uses all comparable holdout cases, including shipments never selected", () => {
  const report = compareMechanisms();
  assert.equal(report.calibration.comparable, 10);
  assert.equal(report.calibration.missingPrediction, 1);
  assert.ok(Math.abs(report.calibration.brierScore - 0.484) < 1e-12);
  assert.deepEqual(report.calibration.byScore.map(({ group, cases, late }) => [group, cases, late]), [
    [0.2, 4, 4], [0.4, 2, 0], [0.8, 4, 1],
  ]);
  assert.deepEqual(report.calibration.byCarrierSignal.find(({ group }) => group === "disruption"), {
    group: "disruption", cases: 4, meanPrediction: 0.2, late: 4,
  });
});
