// Offline reporting projection over reconciled source admissions, metered
// attempts, and independent verifier records. Times use one UTC epoch unit.
// Case identities are already tenant and workflow scoped.
function validId(value) {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
}

function validTime(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function reportCaseOutcomes({ admissions, attempts, verifications, windowStart, windowEnd, asOf }) {
  if (![windowStart, windowEnd, asOf].every(validTime) || windowStart >= windowEnd || asOf < windowStart) {
    throw new Error("invalid reporting window or cutoff");
  }

  const cases = new Map();
  for (const admission of admissions) {
    const { caseId, arrivedAt } = admission;
    if (!validId(caseId) || !validTime(arrivedAt)) throw new Error("invalid case admission");
    if (arrivedAt < windowStart || arrivedAt >= windowEnd || arrivedAt > asOf) continue;
    if (cases.has(caseId)) throw new Error("duplicate eligible case admission");
    cases.set(caseId, { arrivedAt, verification: null, revisions: new Set() });
  }

  const priorRuns = new Set();
  const attemptDispositions = { completed: 0, failed: 0, abandoned: 0, pending: 0 };
  let costCents = 0;
  for (const { caseId, runId, recordedAt, attemptCostCents, disposition } of attempts) {
    if (!validId(caseId) || !validId(runId) || !validTime(recordedAt)) throw new Error("invalid attempt record");
    const entry = cases.get(caseId);
    if (entry && recordedAt < entry.arrivedAt) throw new Error("attempt record predates admission");
    if (!entry || recordedAt > asOf) continue;
    if (priorRuns.has(runId)) throw new Error("duplicate attempt cost record");
    if (!Number.isSafeInteger(attemptCostCents) || attemptCostCents < 0) {
      throw new Error("attempt cost must be nonnegative integer cents");
    }
    if (!Object.hasOwn(attemptDispositions, disposition)) throw new Error("invalid attempt disposition");
    priorRuns.add(runId);
    attemptDispositions[disposition] += 1;
    costCents += attemptCostCents;
    if (!Number.isSafeInteger(costCents)) throw new Error("total attempt cost exceeds safe integer cents");
  }

  for (const verification of verifications) {
    const { caseId, revision, disposition, occurredAt, observedAt } = verification;
    const entry = cases.get(caseId);
    if (!validId(caseId) || !validTime(occurredAt) || !validTime(observedAt)
      || observedAt < occurredAt || (entry && occurredAt < entry.arrivedAt)
      || !Number.isSafeInteger(revision) || revision < 1
      || !["accepted", "rejected"].includes(disposition)) {
      throw new Error("invalid verifier record");
    }
    if (!entry || observedAt > asOf) continue;
    if (entry.revisions.has(revision)) throw new Error("duplicate verifier revision");
    entry.revisions.add(revision);
    if (!entry.verification || entry.verification.revision < revision) {
      entry.verification = verification;
    }
  }

  let acceptedCases = 0;
  let pendingCases = 0;
  for (const { verification } of cases.values()) {
    if (verification === null) pendingCases += 1;
    else if (verification.disposition === "accepted") acceptedCases += 1;
  }
  const settledAttempts = priorRuns.size - attemptDispositions.pending;
  return {
    eligibleCases: cases.size,
    acceptedCases,
    pendingCases,
    attempts: priorRuns.size,
    attemptDispositions,
    attemptCompletionRate: settledAttempts ? attemptDispositions.completed / settledAttempts : null,
    attemptCostCents: costCents,
    acceptedOutcomeRate: cases.size ? acceptedCases / cases.size : null,
  };
}
