# Skunkworks Academy Registry Migration Matrix — 2026-08-20

## Authoritative audit status

- Source audit generated: `2026-08-20T21:37:02.087Z`
- GitHub Actions workflow run: `32418015415`
- Audit evidence artifact: `organization-registry-audit-32418015415-2` (`9425426269`)
- Repositories discovered and audited: **81 / 81**
- Compliant repositories: **75**
- Non-compliant repositories: **6**
- Files scanned: **159**
- Errors: **15**
- Warnings: **0**
- Clone failures: **0**
- Audit runtime failures: **0**

`ORG_PACKAGE_REGISTRY_PAT` passed credential verification. The audit covered all 81 repositories returned by the organization repository inventory, including private repositories available to the organization audit credential. The workflow failed by design because six repositories violated the authoritative registry policy; it did not fail because of missing access or audit runtime errors.

## Migration priority summary

| Priority | Meaning | Repository count |
|---|---|---:|
| P0 | Access/runtime blocker or hardcoded credential | 0 |
| P1 | Registry/image remediation required | 6 |
| P2 | Warning / manual review | 0 |
| P3 | Compliant | 75 |

## P1 remediation backlog

### `skunkworks-academy/aap-demo`

- Visibility: `public`
- Default branch: `main`
- Files scanned: 12
- Errors: 5
- Trigger rules: `deployment-image-registry, foreign-registry`

| Rule | File | Line | Finding |
|---|---|---:|---|
| `foreign-registry` | `config/manifests/local-path-provisioner.yaml` | 159 | Non-authoritative registry host found; publish and deployment targets must use ghcr.io or a protocol-specific GitHub Packages endpoint. |
| `deployment-image-registry` | `config/manifests/local-path-provisioner.yaml` | 89 | Deployment image rancher/local-path-provisioner:v0.0.30 must resolve to ghcr.io/{owner}/{repository}. |
| `deployment-image-registry` | `config/manifests/local-path-provisioner.yaml` | 159 | Deployment image quay.io/prometheus/busybox:latest must resolve to ghcr.io/{owner}/{repository}. |
| `deployment-image-registry` | `config/manifests/nfs-provisioner.yaml` | 88 | Deployment image registry.k8s.io/sig-storage/nfs-subdir-external-provisioner:v4.0.2 must resolve to ghcr.io/{owner}/{repository}. |
| `deployment-image-registry` | `config/manifests/nfs-server.yaml` | 44 | Deployment image registry.k8s.io/volume-nfs:0.8 must resolve to ghcr.io/{owner}/{repository}. |

**Required action:** Migrate registry/authentication/image references to GitHub Packages/GHCR and rerun governance.

### `skunkworks-academy/api`

- Visibility: `public`
- Default branch: `main`
- Files scanned: 3
- Errors: 3
- Trigger rules: `base-image-registry`

| Rule | File | Line | Finding |
|---|---|---:|---|
| `base-image-registry` | `Dockerfile` | 1 | Base image node:20-alpine is not sourced from ghcr.io. Mirror approved base images into GHCR before production use. |
| `base-image-registry` | `Dockerfile` | 6 | Base image node:20-alpine is not sourced from ghcr.io. Mirror approved base images into GHCR before production use. |
| `base-image-registry` | `Dockerfile` | 12 | Base image node:20-alpine is not sourced from ghcr.io. Mirror approved base images into GHCR before production use. |

**Required action:** Migrate registry/authentication/image references to GitHub Packages/GHCR and rerun governance.

### `skunkworks-academy/DockSec`

- Visibility: `public`
- Default branch: `main`
- Files scanned: 6
- Errors: 1
- Trigger rules: `base-image-registry`

| Rule | File | Line | Finding |
|---|---|---:|---|
| `base-image-registry` | `Dockerfile` | 1 | Base image python:3.12-slim is not sourced from ghcr.io. Mirror approved base images into GHCR before production use. |

**Required action:** Migrate registry/authentication/image references to GitHub Packages/GHCR and rerun governance.

### `skunkworks-academy/DonkAI`

- Visibility: `public`
- Default branch: `main`
- Files scanned: 5
- Errors: 3
- Trigger rules: `base-image-registry, deployment-image-registry`

| Rule | File | Line | Finding |
|---|---|---:|---|
| `deployment-image-registry` | `docker-compose.yml` | 3 | Deployment image postgres:15-alpine must resolve to ghcr.io/{owner}/{repository}. |
| `base-image-registry` | `ml-service/Dockerfile` | 1 | Base image python:3.11-slim is not sourced from ghcr.io. Mirror approved base images into GHCR before production use. |
| `base-image-registry` | `webapp/Dockerfile` | 1 | Base image node:18-alpine is not sourced from ghcr.io. Mirror approved base images into GHCR before production use. |

**Required action:** Migrate registry/authentication/image references to GitHub Packages/GHCR and rerun governance.

### `skunkworks-academy/labs-access-gateway`

- Visibility: `private`
- Default branch: `main`
- Files scanned: 1
- Errors: 1
- Trigger rules: `deployment-image-registry`

| Rule | File | Line | Finding |
|---|---|---:|---|
| `deployment-image-registry` | `docker-compose.yml` | 3 | Deployment image nginx:stable-alpine must resolve to ghcr.io/{owner}/{repository}. |

**Required action:** Migrate registry/authentication/image references to GitHub Packages/GHCR and rerun governance.

### `skunkworks-academy/www-project-eks-goat`

- Visibility: `public`
- Default branch: `main`
- Files scanned: 6
- Errors: 2
- Trigger rules: `base-image-registry`

| Rule | File | Line | Finding |
|---|---|---:|---|
| `base-image-registry` | `eks/Dockerfile` | 2 | Base image ubuntu:latest is not sourced from ghcr.io. Mirror approved base images into GHCR before production use. |
| `base-image-registry` | `eks/ec2_terraform/Dockerfile` | 1 | Base image gurubaba/jenkins:latest is not sourced from ghcr.io. Mirror approved base images into GHCR before production use. |

**Required action:** Migrate registry/authentication/image references to GitHub Packages/GHCR and rerun governance.

## Full repository matrix

| Priority | State | Repository | Visibility | Files | Errors | Warnings | Trigger rules |
|---|---|---|---|---:|---:|---:|---|
| P1 | REMEDIATE | `skunkworks-academy/aap-demo` | public | 12 | 5 | 0 | deployment-image-registry, foreign-registry |
| P1 | REMEDIATE | `skunkworks-academy/api` | public | 3 | 3 | 0 | base-image-registry |
| P1 | REMEDIATE | `skunkworks-academy/DockSec` | public | 6 | 1 | 0 | base-image-registry |
| P1 | REMEDIATE | `skunkworks-academy/DonkAI` | public | 5 | 3 | 0 | base-image-registry, deployment-image-registry |
| P1 | REMEDIATE | `skunkworks-academy/labs-access-gateway` | private | 1 | 1 | 0 | deployment-image-registry |
| P1 | REMEDIATE | `skunkworks-academy/www-project-eks-goat` | public | 6 | 2 | 0 | base-image-registry |
| P3 | COMPLIANT | `skunkworks-academy/8G` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/aacca` | public | 4 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/academy-portal` | private | 1 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/academy-validation` | public | 7 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/app` | public | 1 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/asterisk` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/AZ-040T00-Automating-Administration-with-PowerShell` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/AZ-104-MicrosoftAzureAdministrator` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/AZ500-AzureSecurityTechnologies` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/azure-devops` | private | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/badging` | public | 3 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/brand` | public | 4 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/careers` | public | 3 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/cdn` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/cisco` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/cisco-ethical-hacker-notes` | private | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/classrooms` | public | 2 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/cld-uf-101` | public | 1 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/CO.LAB` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/comptia` | public | 1 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/copilot-cli-for-beginners` | public | 8 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/course-catalog` | public | 3 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/cp4ba-labs` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/CSES-01` | public | 2 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/dashboard` | public | 2 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/DataVault-EDW-Training` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/db2-summit-lab` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/docs` | public | 3 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/dp-300-database-administrator` | public | 1 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/dpg-610a` | public | 2 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/faculty` | public | 1 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/financial-literacy` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/fksmm` | public | 3 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/google` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/ibm` | public | 6 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/instructor` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/instructors` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/jobs` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/labs` | public | 9 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/labs-booking` | private | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/labs-catalog` | public | 1 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/labs-evidence` | private | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/labs-guides` | public | 1 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/labs-provisioning` | private | 1 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/learn` | public | 3 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/lms` | public | 2 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/login` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/ls1607` | public | 4 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/marketing` | public | 2 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/mastering-productivity-with-ai` | private | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/maximo-labs` | public | 1 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/MCT-User-Guide` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/media` | public | 1 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/microsoft` | public | 2 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/ms-102` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/mslearn-github` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/osint` | public | 3 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/partner` | private | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/PL-300-Microsoft-Power-BI-Data-Analyst` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/PL-900-Microsoft-Power-Platform-Fundamentals` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/portal` | public | 10 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/prod-101` | public | 3 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/prompt` | public | 1 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/publish` | public | 1 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/python` | public | 1 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/search-index` | private | 2 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/security` | public | 4 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/sso` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/staff` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/student` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/TeamGuide` | public | 1 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/udemy` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/watsonx-genai-lab` | public | 1 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/webspherelab` | public | 0 | 0 | 0 | - |
| P3 | COMPLIANT | `skunkworks-academy/www` | public | 14 | 0 | 0 | - |

## Acceptance criteria

1. Remediate all six P1 repositories through repository-specific pull requests.
2. Mirror required third-party base/deployment images into the owning repository GHCR namespace before production use.
3. Replace direct public/foreign registry references with approved `ghcr.io/skunkworks-academy/<repository>` references.
4. Preserve immutable tags/digests for deployment promotion.
5. Rerun the organization audit until P0/P1/P2 counts are zero and all repositories classify P3.
6. Keep the scheduled organization audit enabled as the continuous control.
