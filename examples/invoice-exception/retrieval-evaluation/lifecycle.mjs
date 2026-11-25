import { pathToFileURL } from "node:url";
import { corpus } from "./corpus.mjs";

const policy = corpus.find(({ source_id }) => source_id === "policy-ap17-v3");
const control = corpus.find(({ source_id }) => source_id === "credit-note-guide-v1");
const correctedPolicy = {
  ...policy,
  source_id: "policy-ap17-v4",
  revision: "4",
  text: "Policy AP-17 revision 4. A designated reviewer must approve and record the purchase order before posting an invoice correction.",
};
const family = "AP-17";

function projection(source, rank, sourceFamily = family) {
  return {
    family: sourceFamily,
    rank,
    source_id: source.source_id,
    source_revision: source.revision,
    excerpt: source.text,
  };
}

// Search and cache expose simple local read models. Production adapters need a
// real authoritative scope check and must report the revision actually read.
function createFixture({ guardDelayedWrite, enforceCurrentAccess, reportSnapshot }) {
  let sourceRevision = 3;
  let accessAllowed = true;
  let postings = [projection(policy, 1), projection(control, 1, "credit-note")];
  let cachedSummary = projection(policy, 1);
  let indexRevision = 1;
  let appliedSourceRevision = sourceRevision;

  const delayed = { sourceRevision, posting: projection(policy, 2) };
  return {
    correct() {
      sourceRevision += 1;
      postings = postings.filter((posting) => posting.family !== family);
      postings.unshift(projection(correctedPolicy, 1));
      cachedSummary = projection(correctedPolicy, 1);
      appliedSourceRevision = sourceRevision;
      indexRevision += 1;
    },
    deliverDelayed() {
      if (guardDelayedWrite && delayed.sourceRevision !== sourceRevision) return "skipped_stale";
      postings = [...postings.filter((posting) => posting.family !== family || posting.rank !== 2), delayed.posting];
      cachedSummary = delayed.posting;
      // A late write can change a later snapshot without making its content current.
      indexRevision += 1;
      return "written";
    },
    withdraw() {
      sourceRevision += 1;
      accessAllowed = false;
      postings = postings.filter((posting) => posting.family !== family);
      cachedSummary = null;
      appliedSourceRevision = sourceRevision;
      indexRevision += 1;
    },
    read() {
      const permitted = accessAllowed || !enforceCurrentAccess;
      return {
        snapshot: reportSnapshot
          ? { index_revision: indexRevision, applied_source_revision: appliedSourceRevision }
          : null,
        search: structuredClone(permitted ? postings.filter((item) => item.family === family) : []),
        reader_summary: structuredClone(permitted ? cachedSummary : null),
        unaffected_control: structuredClone(postings.find((item) => item.family === "credit-note") ?? null),
      };
    },
  };
}

// Expectations come from the synthetic authoritative timeline. They stay
// outside the delayed worker and inspect every returned item, not just rank 1.
function grade(read, expectedEpoch, expectedPolicy) {
  const findings = [];
  const exposed = [...read.search, ...(read.reader_summary ? [read.reader_summary] : [])];
  if (expectedPolicy) {
    if (read.search[0]?.source_id !== expectedPolicy.source_id) findings.push("current_policy_missing");
    if (read.search.some(({ source_id, source_revision }) =>
      source_id !== expectedPolicy.source_id || source_revision !== expectedPolicy.revision)) {
      findings.push("stale_search_evidence");
    }
    if (read.reader_summary?.source_id !== expectedPolicy.source_id
      || read.reader_summary?.source_revision !== expectedPolicy.revision) findings.push("stale_or_missing_summary");
  } else if (exposed.length > 0) {
    findings.push("withdrawn_evidence_visible");
  }
  if (read.unaffected_control?.source_id !== control.source_id
    || read.unaffected_control.source_revision !== control.revision) findings.push("control_missing");
  const snapshotKnown = Number.isInteger(read.snapshot?.index_revision)
    && read.snapshot.applied_source_revision === expectedEpoch;
  if (!snapshotKnown) findings.push("expected_snapshot_unverified");
  return {
    verdict: findings.some((finding) => finding !== "expected_snapshot_unverified") ? "FAIL" : snapshotKnown ? "PASS" : "NOT TESTED",
    findings,
  };
}

export function runLifecycle({
  guardDelayedWrite = true,
  enforceCurrentAccess = true,
  reportSnapshot = true,
} = {}) {
  const fixture = createFixture({ guardDelayedWrite, enforceCurrentAccess, reportSnapshot });
  const stages = [];
  function observe(stage, expectedEpoch, expectedPolicy, delayedWrite = null) {
    const read = fixture.read();
    stages.push({ stage, expected_source_revision: expectedEpoch, delayed_write: delayedWrite, read, ...grade(read, expectedEpoch, expectedPolicy) });
  }

  observe("before_correction", 3, policy);
  fixture.correct();
  observe("after_delayed_correction_write", 4, correctedPolicy, fixture.deliverDelayed());
  fixture.withdraw();
  observe("after_delayed_withdrawal_write", 5, null, fixture.deliverDelayed());

  return {
    stages,
    scope: {
      tested: ["local caller-visible ranked search", "local reader summary", "unaffected credit-note projection"],
      not_tested: ["physical storage erasure", "backup copies", "other derived stores", "model memory or weights"],
    },
    disposition: "inconclusive_for_deployment",
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const report = {
    guarded: runLifecycle(),
    stale_write_control: runLifecycle({ guardDelayedWrite: false }),
    withdrawn_evidence_control: runLifecycle({ guardDelayedWrite: false, enforceCurrentAccess: false }),
    unobservable_snapshot_control: runLifecycle({ reportSnapshot: false }),
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
