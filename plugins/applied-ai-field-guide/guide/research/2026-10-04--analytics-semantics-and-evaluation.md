# Analytics semantics and result evaluation

Reviewed: 2026-10-04. Review again by 2027-04-04, or sooner if the cited product behavior changes.

<a id="r26-93"></a>
## R26-93 — A valid query can still answer the wrong question

- Sources inspected: [dbt Semantic Layer join logic](https://docs.getdbt.com/docs/build/join-logic), [Snowflake Cortex Analyst evaluations](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-analyst-evaluations), and [DataHub context ingestion](https://docs.datahub.com/docs/managed-datahub/build-a-data-agent/ingest-context). These are first-party product documentation, not independent accuracy studies.
- dbt describes entity-based join selection that avoids fanout and chasm joins. The portable finding is that join paths and cardinality belong in the metric contract. A declared key or accepted query plan still needs checking against the actual data.
- Snowflake compares executed candidate-query results with verified-query results. It removes selected reference queries from the evaluation-time semantic view, recommends absolute dates, and supports pinning the correctness-metric version. Other runtime examples remain available; version pinning does not make generation deterministic. This is bounded SQL evaluation, not proof of an entire analytical workflow.
- DataHub recommends reusing existing semantic models, or starting with documentation when those models do not exist. Schema, ownership, and lineage metadata can support context assembly without creating another source of metric truth. Metadata ingestion alone does not verify a calculation or grant access.

## Repository decision

Add a short responsibility crosswalk to [Context and Knowledge Systems](../library/02-context-and-knowledge-systems.md#structured-data). A semantic layer defines calculations and query semantics; an ontology describes domain types and relationships; a knowledge graph connects attributable facts; context assembly prepares permitted evidence for a decision. These responsibilities can share an implementation. They are not four required products or the Guide's four purpose-bound data-use planes.

Sharpen the existing [data-analysis blueprint](../blueprints/data-analysis-agent.md): record formulas, filters, null treatment, grain, valid rollups, join cardinality, and applicable reporting-calendar and currency rules. Evaluate held-out questions using independently verified results, fixed time windows, matching source snapshots, and approved tolerances. Keep reference answers outside runtime context and check the meaning of the result, not just whether SQL ran (`CTX-006`, `CTX-008`, `EVA-002`, `EVA-006`, `EVA-007`).

Extend the existing [finance walkthrough](../examples/finance-variance-commentary/README.md#when-the-query-runs-and-the-total-is-wrong) with a fictional one-to-many join that triples an order total. Its arithmetic is a teaching regression, not measured customer benefit or production evidence.

No new control, schema, skill, runtime, graph platform, or executable lab is required. A semantic layer is useful for governed analytical metrics; it is not a universal first step for every applied-AI workflow. Product documentation does not establish portable accuracy or savings, and source-result agreement does not replace source-authority, completeness, permission, or business-review checks.
