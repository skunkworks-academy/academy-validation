# Skunkworks Academy Registry Migration Matrix — 2026-08-20

## Status

This is the operator-side baseline created before the permanent organization workflow can complete. The GitHub Actions organization audit was triggered through temporary PR #9 and failed at `Verify organization audit credential` because `ORG_PACKAGE_REGISTRY_PAT` is not currently available to `skunkworks-academy/academy-validation`.

Issue #10 tracks the missing organization secret. Once that secret is configured, the permanent `Organization Artifact Registry Audit` workflow will generate the authoritative machine-readable and Markdown migration matrices automatically.

## Authoritative target

- Container / OCI registry: `ghcr.io`
- Namespace: `ghcr.io/skunkworks-academy/<repository>`
- Package authority: GitHub Packages
- Same-repository authentication: `secrets.GITHUB_TOKEN`
- Cross-repository organization audit / package access: `secrets.ORG_PACKAGE_REGISTRY_PAT`

## Confirmed rollout state

| Priority | Repository | Current state | Evidence / next action |
|---|---|---|---|
| P3 | `skunkworks-academy/academy-validation` | Control plane implemented | Central registry governance, reusable GHCR build/publish, pull verification, release manifest and scheduled organization audit are on `main`. |
| P3 | `skunkworks-academy/labs` | Governance + GHCR build path implemented | Registry governance and GHCR-oriented lab image path are in place. Keep as the reference container workload. |
| P3 | `skunkworks-academy/portal` | Governance implemented | Registry Governance check is installed and has passed. |
| P3 | `skunkworks-academy/course-catalog` | Governance implemented | Registry Governance check is installed and has passed. |
| P3 | `skunkworks-academy/www` | Governance implemented | Registry Governance check is installed and has passed. |
| P1 | `skunkworks-academy/api` | Confirmed remediation candidate | Organization code search surfaced a root `Dockerfile` using a non-GHCR `FROM node:` base. Mirror the approved Node base into GHCR and migrate the Dockerfile before production publication. |

## High-priority full-audit candidates

The following repositories are prioritized for the first authoritative scan because their repository purpose or naming indicates application, API, infrastructure, identity, deployment, lab-runtime, publishing, or platform responsibility. This prioritization is operational triage, not a claim that each repository is currently non-compliant.

| Priority | Repository | Reason for early audit |
|---|---|---|
| P1 | `skunkworks-academy/lms` | Learning platform / application surface |
| P1 | `skunkworks-academy/azure-devops` | DevOps / deployment configuration |
| P1 | `skunkworks-academy/app` | Application repository |
| P1 | `skunkworks-academy/dashboard` | Application/dashboard surface |
| P1 | `skunkworks-academy/asterisk` | Service/runtime configuration |
| P1 | `skunkworks-academy/ibm` | Large technical/lab repository with deployable content potential |
| P1 | `skunkworks-academy/microsoft` | Platform integration / deployable content potential |
| P1 | `skunkworks-academy/security` | Security/lab runtime content |
| P1 | `skunkworks-academy/comptia` | Application/course delivery surface |
| P1 | `skunkworks-academy/labs-provisioning` | Private provisioning service |
| P1 | `skunkworks-academy/labs-access-gateway` | Private access gateway |
| P1 | `skunkworks-academy/labs-booking` | Private application/service |
| P1 | `skunkworks-academy/labs-evidence` | Private service/data workflow |
| P1 | `skunkworks-academy/academy-portal` | Private portal application |
| P1 | `skunkworks-academy/maximo-labs` | Large lab/runtime repository |
| P1 | `skunkworks-academy/watsonx-genai-lab` | Lab/runtime repository |
| P1 | `skunkworks-academy/db2-summit-lab` | Lab/runtime repository |
| P1 | `skunkworks-academy/cp4ba-labs` | Large lab/runtime repository |
| P1 | `skunkworks-academy/webspherelab` | Large lab/runtime repository |
| P1 | `skunkworks-academy/DockSec` | Container/security lab repository |
| P1 | `skunkworks-academy/www-project-eks-goat` | Kubernetes/EKS lab repository |
| P1 | `skunkworks-academy/aap-demo` | Automation/deployment repository |
| P1 | `skunkworks-academy/publish` | Publication pipeline surface |
| P1 | `skunkworks-academy/search-index` | Private service/indexing surface |
| P1 | `skunkworks-academy/login` | Identity/authentication surface |
| P1 | `skunkworks-academy/sso` | Identity/authentication surface |
| P1 | `skunkworks-academy/cdn` | Delivery/infrastructure surface |

## Connector-side registry discovery completed

The operator-side GitHub code searches completed before the Actions audit was blocked found no active ECR/GAR/GCR/ACR/Quay/GitLab registry endpoints outside the central policy/control-plane files. Searches for `docker.io`, `pkg.dev`, `gcr.io`, `azurecr.io`, `quay.io`, `registry.gitlab.com`, `dkr.ecr` and `artifactory` either returned no results or only the registry policy/audit implementation itself.

The organization does have active GHCR publication/governance references in the central control plane and Labs. The confirmed non-GHCR production-base finding currently requiring remediation is the `api` repository Dockerfile.

## Remaining inventory pending authoritative audit

The GitHub App installation can see the remaining organization repositories, including public and private repositories, but the scheduled Actions audit cannot clone and scan them until `ORG_PACKAGE_REGISTRY_PAT` is configured. These repositories remain `P2 / pending authoritative scan` unless promoted above based on platform criticality:

`classrooms`, `python`, `DataVault-EDW-Training`, `instructors`, `AZ-040T00-Automating-Administration-with-PowerShell`, `media`, `jobs`, `financial-literacy`, `udemy`, `8G`, `ms-102`, `faculty`, `CSES-01`, `badging`, `cld-uf-101`, `partner`, `labs-catalog`, `labs-guides`, `PL-900-Microsoft-Power-Platform-Fundamentals`, `AZ-104-MicrosoftAzureAdministrator`, `AZ500-AzureSecurityTechnologies`, `PL-300-Microsoft-Power-BI-Data-Analyst`, `dp-300-database-administrator`, `MCT-User-Guide`, `mslearn-github`, `DonkAI`, `CO.LAB`, `dpg-610a`, `prompt`, `learn`, `copilot-cli-for-beginners`, `docs`, `google`, `cisco`, `prod-101`, `careers`, `ls1607`, `mastering-productivity-with-ai`, `aacca`, `osint`, `marketing`, `brand`, `cisco-ethical-hacker-notes`, `fksmm`, `student`, `instructor`, `staff`.

## Acceptance criteria for closing this matrix baseline

1. Configure organization Actions secret `ORG_PACKAGE_REGISTRY_PAT` with organization metadata read, repository contents read across all Academy repositories, and packages read.
2. Run `Organization Artifact Registry Audit` manually.
3. Confirm the workflow uploads `organization-registry-audit-*` evidence.
4. Use the generated `organization-registry-migration-matrix.md` as the authoritative remediation backlog.
5. Create repository remediation PRs for every P0/P1 result.
6. Rerun until the organization audit reports zero inaccessible repositories and zero non-compliant publication/deployment targets.
