# Security Policy

## Supported versions

Security fixes land on `main`. Once a tagged release exists, support covers the latest release and `main`, not older releases.

| Version | Supported |
| --- | --- |
| `main` | Yes |
| Latest tagged release, if available | Yes |
| Older releases | No |

## Report a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/davidahma/ai-guide/security/advisories/new). Do not open a public issue for a suspected vulnerability.

Include the affected file or control, impact, reproduction steps, and a minimal proof of concept when safe. Relevant reports include:

- a bypass in the executable authorization, idempotency, or readback examples;
- an exploitable dependency or GitHub Actions configuration;
- a schema or control defect that would permit a documented unsafe effect;
- leaked credentials, personal data, or confidential material.

Ordinary documentation disagreements and non-security correctness defects belong in [Issues](https://github.com/davidahma/ai-guide/issues).

The maintainer will coordinate disclosure and credit with the reporter. This project is a reference guide, not a hosted service; no response-time or remediation SLA is offered.
