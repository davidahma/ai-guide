import { pathToFileURL } from "node:url";
import {
  fixtureRevision, makeFixture, outcomeCutoff, reviewerMinutesPerBatch, splitAt,
} from "./mechanism-comparison-fixture.mjs";

const beforeOrAt = (left, right) => Date.parse(left) <= Date.parse(right);
const queueOrder = (left, right) => Date.parse(left.queuedAt) - Date.parse(right.queuedAt)
  || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);

// The candidates never receive delivery outcomes or future versions of carrier signals.
export function decisionSnapshot(shipment) {
  if (!beforeOrAt(shipment.queuedAt, shipment.decisionAt)) {
    throw new Error(`Invalid queue timing for ${shipment.id}: queuedAt must be at or before decisionAt`);
  }
  if (!Number.isInteger(shipment.reviewMinutes) || shipment.reviewMinutes <= 0) {
    throw new Error(`Invalid review minutes for ${shipment.id}`);
  }
  const signal = shipment.signals
    .filter(({ observedAt, availableAt }) => beforeOrAt(observedAt, availableAt)
      && beforeOrAt(availableAt, shipment.decisionAt))
    .sort((left, right) => Date.parse(right.observedAt) - Date.parse(left.observedAt)
      || Date.parse(right.availableAt) - Date.parse(left.availableAt))[0];
  return {
    id: shipment.id,
    decisionAt: shipment.decisionAt,
    queuedAt: shipment.queuedAt,
    reviewMinutes: shipment.reviewMinutes,
    scanDelayMinutes: Number.isFinite(signal?.scanDelayMinutes) && signal.scanDelayMinutes >= 0
      ? signal.scanDelayMinutes : null,
    carrierDisruption: typeof signal?.carrierDisruption === "boolean" ? signal.carrierDisruption : null,
  };
}

function bucket({ scanDelayMinutes, carrierDisruption }) {
  if (scanDelayMinutes === null || carrierDisruption === null) return null;
  return `${scanDelayMinutes >= 60 ? "long" : "short"}/${carrierDisruption ? "disruption" : "normal"}`;
}

function knownOutcome(row, outcomes, cutoff) {
  const label = outcomes[row.id];
  return typeof label?.late === "boolean" && Date.parse(label.availableAt) > Date.parse(row.decisionAt)
    && beforeOrAt(label.availableAt, cutoff) ? label.late : null;
}

function fit(rows, outcomes) {
  const counts = {};
  let used = 0;
  for (const row of rows) {
    const group = bucket(row);
    const late = knownOutcome(row, outcomes, splitAt);
    if (group === null || late === null) continue;
    counts[group] ??= { cases: 0, late: 0 };
    counts[group].cases += 1;
    counts[group].late += Number(late);
    used += 1;
  }
  // Add one late and one on-time pseudo-observation to each observed group.
  const rates = Object.fromEntries(Object.entries(counts).map(([group, stat]) => [
    group, (stat.late + 1) / (stat.cases + 2),
  ]));
  return { used, excluded: rows.length - used, counts, rates };
}

function plan(rows, priority) {
  const fifo = [...rows].sort(queueOrder).map((row) => ({ ...row, priority: priority(row) }));
  const ranked = fifo.filter((row) => row.priority !== null)
    .sort((left, right) => right.priority - left.priority || queueOrder(left, right));
  // If inputs are missing, do not assign low risk or move that case down the existing queue.
  let nextRanked = 0;
  const order = fifo.map((row) => row.priority === null ? row : ranked[nextRanked++]);
  const selected = [];
  let minutes = 0;
  for (const row of order) {
    if (minutes + row.reviewMinutes > reviewerMinutesPerBatch) break;
    selected.push(row.id);
    minutes += row.reviewMinutes;
  }
  return { order, selected, minutes };
}

function replay(rows, priority, outcomes) {
  const batches = [];
  for (const at of [...new Set(rows.map((row) => row.decisionAt))].sort()) {
    const candidates = rows.filter((row) => row.decisionAt === at);
    const { order, selected, minutes } = plan(candidates, priority);
    const reviewed = order.filter((row) => selected.includes(row.id));
    const fallback = order.filter((row) => row.priority === null);
    batches.push({
      at,
      cap: reviewerMinutesPerBatch,
      minutes,
      selected,
      order: order.map((row) => row.id),
      knownLateReviewed: reviewed.filter((row) => knownOutcome(row, outcomes, outcomeCutoff) === true).length,
      unknownOutcomeReviewed: reviewed.filter((row) => knownOutcome(row, outcomes, outcomeCutoff) === null).length,
      fallbackInQueue: fallback.length,
      fallbackReviewed: fallback.filter((row) => selected.includes(row.id)).length,
    });
  }
  const total = (field) => batches.reduce((sum, batch) => sum + batch[field], 0);
  return {
    minutes: total("minutes"), knownLateReviewed: total("knownLateReviewed"),
    unknownOutcomeReviewed: total("unknownOutcomeReviewed"), fallbackInQueue: total("fallbackInQueue"),
    fallbackReviewed: total("fallbackReviewed"), batches,
  };
}

function calibration(rows, predictor, outcomes) {
  const groups = new Map();
  const slices = new Map();
  let squaredError = 0;
  let comparable = 0;
  let missingPrediction = 0;
  const add = (map, key, prediction, late) => {
    const stats = map.get(key) ?? { cases: 0, predicted: 0, late: 0 };
    stats.cases += 1;
    stats.predicted += prediction;
    stats.late += Number(late);
    map.set(key, stats);
  };
  for (const row of rows) {
    const prediction = predictor(row);
    if (prediction === null) missingPrediction += 1;
    const late = knownOutcome(row, outcomes, outcomeCutoff);
    if (prediction === null || late === null) continue;
    comparable += 1;
    squaredError += (prediction - Number(late)) ** 2;
    add(groups, prediction, prediction, late);
    add(slices, row.carrierDisruption ? "disruption" : "no disruption", prediction, late);
  }
  const meanRates = ([key, stats]) => ({
    group: key, cases: stats.cases, meanPrediction: stats.predicted / stats.cases, late: stats.late,
  });
  return {
    comparable,
    missingPrediction,
    brierScore: comparable ? squaredError / comparable : null,
    byScore: [...groups.entries()].sort(([left], [right]) => left - right).map(meanRates),
    byCarrierSignal: [...slices.entries()].map(meanRates),
  };
}

export function compareMechanisms({ shipments, outcomes } = makeFixture()) {
  const snapshots = shipments.map(decisionSnapshot);
  const trainingRows = snapshots.filter((row) => Date.parse(row.decisionAt) < Date.parse(splitAt));
  const holdout = snapshots.filter((row) => Date.parse(row.decisionAt) >= Date.parse(splitAt)
    && Date.parse(row.decisionAt) < Date.parse(outcomeCutoff));
  const training = fit(trainingRows, outcomes);
  const predictor = (row) => training.rates[bucket(row)] ?? null;
  const baseline = replay(holdout, () => 0, outcomes);
  const rule = replay(holdout, (row) => row.carrierDisruption === null ? null : Number(row.carrierDisruption), outcomes);
  const fitted = replay(holdout, predictor, outcomes);
  const outcomesKnown = holdout.filter((row) => knownOutcome(row, outcomes, outcomeCutoff) !== null).length;
  const knownLate = holdout.filter((row) => knownOutcome(row, outcomes, outcomeCutoff) === true).length;
  const example = holdout.find((row) => row.id === "FEB01-03");
  const batch = fitted.batches.find((entry) => entry.at === example?.decisionAt);
  return {
    fixtureRevision, splitAt, outcomeCutoff, training,
    holdout: { shipments: holdout.length, outcomesKnown, outcomesUnknown: holdout.length - outcomesKnown, knownLate },
    baseline, rule, fitted, calibration: calibration(holdout, predictor, outcomes),
    missedExample: example && batch ? {
      id: example.id, knownLate: knownOutcome(example, outcomes, outcomeCutoff),
      score: predictor(example), rank: batch.order.indexOf(example.id) + 1, reviewed: batch.selected.includes(example.id),
    } : null,
  };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.stdout.write(`${JSON.stringify(compareMechanisms(), null, 2)}\n`);
}
