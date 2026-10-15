# Reference-Solution Standards Note

## Scope

This note records primary implementation anchors reviewed for the reference-solution accelerators on 2026-08-09. It does not define a universal provider profile or make a compliance claim.

The application-security supplement below was reviewed on 2026-10-15; the earlier source reviews retain their original dates.

## Sources

### RS-01: OpenID Foundation specifications

- **Source:** [OpenID Foundation specification index](https://openid.net/developers/specs/)
- **Source type:** official standards index
- **Reviewed:** 2026-08-09
- **Portable finding:** authentication and authorization profiles have explicit protocol, claim, endpoint, and conformance boundaries. A delivery must select the applicable final specification or named profile rather than treating “OAuth” or “SSO” as one interchangeable behavior.
- **Limit:** conformance to a specification does not prove the application's tenant mapping, session handling, entitlement policy, or request-time authorization.

### RS-02: SCIM protocol

- **Source:** [RFC 7644: System for Cross-domain Identity Management Protocol](https://datatracker.ietf.org/doc/html/rfc7644)
- **Published:** 2015-09
- **Source type:** IETF standards-track RFC
- **Reviewed:** 2026-08-09
- **Portable finding:** SCIM defines resource-management endpoints and methods for cross-domain identity provisioning, with provider schema and processing differences that clients must handle explicitly.
- **Limit:** provisioning state is not a substitute for authorization at the application action boundary.

### RS-03: Stripe usage meters

- **Source:** [Create and configure a meter](https://docs.stripe.com/billing/subscriptions/usage-based/meters/configure)
- **Source type:** current first-party platform documentation
- **Reviewed:** 2026-08-09
- **Portable finding:** a usage-billing integration must make event name, customer mapping, value mapping, ingestion mode, and aggregation formula explicit. Corrections and finalized billing periods have provider-specific constraints.
- **Limit:** this is a changing Stripe contract, not a general billing standard. Verify the current API, event-adjustment window, and invoice behavior before each implementation and keep an internal source ledger for reconciliation.

### RS-04: OpenTelemetry semantic conventions

- **Source:** [OpenTelemetry semantic conventions 1.44.0](https://opentelemetry.io/docs/specs/semconv/)
- **Source type:** official project specification
- **Reviewed:** 2026-08-09
- **Portable finding:** shared telemetry names and signal conventions can improve cross-service operability when their version and stability are explicit.
- **Limit:** generic semantic conventions do not supply workflow outcome, authorization, external-effect, readback, customer-health, or value semantics for a specific system.

### RS-05: Application security verification

- **Sources:** [OWASP ASVS](https://owasp.org/projects/asvs), [Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), and [Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- **Source type:** official open application-security standard and implementation guidance
- **Reviewed:** 2026-10-15
- **Portable finding:** ASVS supplies application-security verification requirements beyond model evaluation. Cite the selected version and requirement IDs because numbering can change. OWASP's authorization guidance calls for deny-by-default checks on each request; its recovery guidance covers reset-token handling and existing-session invalidation choices.
- **Implementation judgment:** identify the host, platform, vendor, and workflow-team responsibilities for applicable foundations, then verify their configured integration. Inherited identity or storage does not establish application correctness. Carry current authorization through queued work and recovery paths, and test the user surface's correction behavior.
- **Limit:** these sources do not establish that every workflow needs a login, uploads, billing, a particular identity protocol, or every ASVS requirement. An ASVS mapping is not a compliance certification or release approval. The target security owner selects the applicable scope; a provider assurance report does not prove the application's behavior.

## Implementation impact

- The [enterprise foundation accelerator](../solutions/enterprise-foundation.md) keeps authentication, provisioning, request authorization, tenant identity, metering, and reconciliation as distinct owned controls.
- The [deployment and operations accelerator](../solutions/deployment-and-operations.md) treats generic telemetry conventions as implementation anchors under a workflow-specific operating contract.
- The [production service readiness record](../templates/production-service-readiness.md#application-and-platform-baseline) makes inherited application foundations explicit without adding a control family or a separate status vocabulary. The [enterprise integration guidance](../library/17-enterprise-integration-and-scale-reality.md#verify-the-application-foundations-you-inherit) links those responsibilities to cross-boundary tests.
- Provider documentation and standards links are starting evidence only. Target deployments still require pinned profiles, contract tests, failure cases, compatibility evidence, and named owners.
