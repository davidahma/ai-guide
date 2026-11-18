export const fixtureRevision = "shipment-mechanism-comparison/1";
export const splitAt = "2026-02-01T00:00:00Z";
export const outcomeCutoff = "2026-02-15T00:00:00Z";
export const reviewerMinutesPerBatch = 10;

function batch(date, outcomesAt, rows) {
  const shipments = [];
  const outcomes = {};
  for (const [index, [id, scanDelayMinutes, carrierDisruption, late, labelAt]] of rows.entries()) {
    const observedAt = `${date}T10:00:00Z`;
    const availableAt = `${date}T11:00:00Z`;
    shipments.push({
      id,
      decisionAt: `${date}T12:00:00Z`,
      queuedAt: `${date}T10:${String(index).padStart(2, "0")}:00Z`,
      reviewMinutes: 5,
      signals: [{ observedAt, availableAt, scanDelayMinutes, carrierDisruption }],
    });
    if (late !== null) outcomes[id] = { late, availableAt: labelAt ?? outcomesAt };
  }
  return { shipments, outcomes };
}

export function makeFixture() {
  // Column order: shipment, scan delay, known disruption, later delivery result, optional label arrival.
  const history = batch("2026-01-20", "2026-01-24T12:00:00Z", [
    ["TRAIN-01", 80, false, true], ["TRAIN-02", 65, false, true], ["TRAIN-03", 74, false, true],
    ["TRAIN-04", 88, true, true], ["TRAIN-05", 92, true, true], ["TRAIN-06", 100, true, false],
    ["TRAIN-07", 12, false, true], ["TRAIN-08", 0, false, false], ["TRAIN-09", 18, false, false],
    ["TRAIN-10", 7, true, false], ["TRAIN-11", 30, true, false], ["TRAIN-12", 5, true, false],
    ["TRAIN-13", 40, true, true, "2026-02-06T12:00:00Z"],
  ]);
  const feb01 = batch("2026-02-01", "2026-02-04T12:00:00Z", [
    ["FEB01-01", 15, false, false], ["FEB01-02", 85, false, true],
    ["FEB01-03", 24, true, true], ["FEB01-04", 40, true, true],
    ["FEB01-05", 75, false, false], ["FEB01-06", null, null, false],
  ]);
  const feb08 = batch("2026-02-08", "2026-02-12T12:00:00Z", [
    ["FEB08-01", 90, false, false], ["FEB08-02", 20, false, null],
    ["FEB08-03", 8, true, true], ["FEB08-04", 70, false, false],
    ["FEB08-05", 19, true, true], ["FEB08-06", 30, false, false],
  ]);
  // Backdated carrier update arrived after triage. It was not on the coordinator's screen.
  feb08.shipments[0].signals.push({
    observedAt: "2026-02-08T11:45:00Z", availableAt: "2026-02-08T12:15:00Z",
    scanDelayMinutes: 5, carrierDisruption: true,
  });
  return {
    shipments: [...history.shipments, ...feb01.shipments, ...feb08.shipments],
    outcomes: { ...history.outcomes, ...feb01.outcomes, ...feb08.outcomes },
  };
}
