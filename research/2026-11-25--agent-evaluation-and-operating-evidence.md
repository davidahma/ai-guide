# Agent evaluation and operating evidence

Reviewed 2026-11-25. Recheck by 2027-05-25 or sooner if a cited specification, rule or study changes.

<a id="r26-94"></a>
## R26-94 — Match resources and break out task classes

- [METR’s November 20 capability study](https://metr.org/blog/2026-11-20-q4-2026-capability-update/) reports that swarms helped relative to best-of-k in some AI R&D tasks with a clear metric and rapid feedback. Other tasks showed uncertain or negative effects. The comparison depends on task, harness, verifier and budget.
- [OpenAI’s November 18 internal study](https://openai.com/index/research-acceleration-jagged-frontier/) reports varying rates of estimated zero-intervention success by task and duration. Its own caveat is that people may delegate different jobs over time, including within the same duration category. The study describes one research organization.
- Compare configurations on the same eligible cases under ceilings for total and per-case resources, including reviewer time. Report interventions, abandonments, pending outcomes and result quality by task class. Treat model or harness benchmarks as hypotheses for the operating workflow.

<a id="r26-95"></a>
## R26-95 — Separate fast feedback from qualification

[Efficient Benchmarking in Production, September 18 preprint](https://arxiv.org/abs/2609.21267) studied repeated evaluation of one analytics agent. The authors report deploying difficulty-stratified fixed subsets for operational simplicity and examine fidelity relative to full evaluations on held-out runs. Treat the reported fidelity and cost as system-specific.

Use a versioned development subset for iteration and measure its misses against a fuller suite. Keep critical invariants in the release lane and keep the protected qualification partition out of tuning. A small average score difference cannot clear a failed high-consequence case.

<a id="r26-96"></a>
## R26-96 — Measure which revisions a reader can still see

- [StaleBench, November 15 preprint](https://arxiv.org/abs/2611.19752) found that retrieval policies with identical first results could yield different reader accuracy when older facts remained in the evidence list. Use an authoritative version and inspect every item passed to the reader.
- [AfterDeleteBench, October 22 preprint](https://arxiv.org/abs/2610.31366) uses matched never-exposed controls and separates information remaining in derived state from write-back and recall in a fresh session. Its findings apply to tested fixed-weight models and memory arrangements.
- The [invoice retrieval lab](../examples/invoice-exception/retrieval-evaluation/README.md#replay-correction-and-withdrawal) exercises a delayed source write, a derived summary, an unaffected control, and missing read-snapshot evidence. It verifies caller-visible behavior in one synthetic setup. Physical erasure and uninspected stores have their own evidence requirements.

<a id="r26-97"></a>
## R26-97 — Verify containment at the affected service

[NIST IR 8621, November 2026](https://csrc.nist.gov/pubs/ir/8621/final) summarizes workshop findings and recommendations on incident management, including containment scoped by authorization, non-human identity, and coordination across providers and deployers. In a drill, verify that already-issued authority is rejected at the applicable read or effect boundary, measure propagation, and reconcile any effects that landed before containment. The workshop report is planning evidence for a drill.

<a id="r26-98"></a>
## R26-98 — Keep authority local as protocol delivery expands

[MCP’s November 24 release retrospective](https://blog.modelcontextprotocol.io/posts/mcp-turns-two/) records October’s beta for Skills and November’s beta for Events.

- [Skills beta](https://skills.extensions.modelcontextprotocol.io/specification/beta/skills#security-considerations) provides a remote source for manifests and files. Carry origin and exact content through cache and approval. Apply local policy before instructions gain authority or executable resources run.
- [Events beta](https://modelcontextprotocol.io/extensions/events/overview#cursors-and-delivery-guarantees) describes cursors and gaps that a consumer can encounter. Persist cursor progress with durable intake, reconcile a gap against the authoritative source, and recheck authority when queued work resumes. The receiving workflow remains responsible for safe effects.

<a id="r26-99"></a>
## R26-99 — Pin interoperability and record regulatory applicability

- [OpenTelemetry core v1.42.0](https://github.com/open-telemetry/semantic-conventions/releases/tag/v1.42.0) documents the move of GenAI conventions to the separate project. The [GenAI v0.1.0 release](https://github.com/open-telemetry/semantic-conventions-genai/releases/tag/v0.1.0) provides a specific interoperability target. Record the export schema and stability level, keep raw messages out of the default projection, and retain policy and independent outcome evidence under their own access and retention contracts.
- [EU Digital Omnibus on AI, Regulation (EU) 2026/1744](https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng), amends the AI Act, including applicability dates for high-risk categories. Use the official text and an accountable applicability decision for the actual jurisdiction, role and system. Document the evidence owner and the event or date that triggers reassessment. Guide controls support engineering review. The competent authority or accountable organization determines applicable obligations and conformity.

## Changes to the Guide

Use the existing evaluation chapters for comparative evidence and qualification, the existing retrieval lab for mutable data, and the current runbook and readiness review for containment, capability admission and applicable obligations.
