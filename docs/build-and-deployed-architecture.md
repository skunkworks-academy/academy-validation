# Skunkworks Academy Build and Deployed Architecture

## Purpose

This document defines the target build, artifact, release and deployment architecture for Skunkworks Academy repositories. It establishes GitHub as the source, CI/CD control plane and package authority, with GHCR as the canonical container and OCI registry.

## Architecture principles

1. **GitHub is the control plane.** Source, pull requests, CI/CD policy, package publication, attestations and release evidence are managed through GitHub.
2. **GHCR is the container/OCI source of truth.** Production container images, Helm OCI charts and registry-backed generic artifacts publish only to `ghcr.io`.
3. **Build once, promote by digest.** A commit produces one immutable artifact. Environments promote the same digest; they do not rebuild independently.
4. **Repository identity drives artifact identity.** Canonical image name: `ghcr.io/${owner}/${repository}` in lowercase.
5. **Immutable deployment references are preferred.** SHA tags are mandatory and deployments should pin the resolved digest.
6. **Least privilege.** Repository workflows use `GITHUB_TOKEN` with `packages: write` only when publishing. Cross-repository package access uses a narrowly scoped organization token or GitHub App credential.
7. **Policy before publication.** Registry governance, tests, security checks and build validation must pass before an artifact is pushed.
8. **Supply-chain evidence travels with the artifact.** SBOM and provenance attestations are generated during publication.

## Logical architecture

```text
Developer / Automation
        |
        v
GitHub Repository
        |
        +--> Pull Request
        |      |
        |      +--> lint / unit / build validation
        |      +--> registry-governance policy
        |      +--> security / dependency checks
        |
        v
Protected main branch
        |
        v
GitHub Actions build workflow
        |
        +--> Resolve canonical artifact name
        +--> Build once
        +--> Generate SBOM
        +--> Generate provenance
        +--> Authenticate to GHCR
        |
        v
GitHub Packages / GHCR
  ghcr.io/<owner>/<repository>
        |
        +--> <git-sha>
        +--> latest (optional moving tag)
        +--> OCI metadata / attestations
        |
        v
Deployment controller / platform
        |
        +--> Development
        +--> Test / QA
        +--> Staging
        +--> Production
               |
               v
        Pull exact approved digest
```

## Build architecture

### 1. Source and branch control

Each deployable repository uses a protected `main` branch. Changes arrive through pull requests. Required checks should include repository-specific tests plus the shared registry-governance control from `skunkworks-academy/academy-validation`.

### 2. Canonical image identity

The default image identity is:

```text
ghcr.io/${{ github.repository_owner }}/${{ github.event.repository.name }}
```

At runtime the workflow converts the complete GitHub repository path to lowercase.

Example:

```text
ghcr.io/skunkworks-academy/labs
```

Component identity inside a multi-image repository is carried in deterministic tags rather than by introducing an unauthorized external registry. For example:

```text
ghcr.io/skunkworks-academy/labs:linux-cli-101-<git-sha>
```

### 3. Tag strategy

Required immutable tag:

```text
<git-sha>
```

Optional convenience tags:

```text
latest
release-<version>
<component>-<git-sha>
```

Deployment promotion should resolve the approved SHA tag to a digest and record that digest in the release/deployment manifest.

### 4. Authentication

Default repository publication:

```yaml
permissions:
  contents: read
  packages: write
```

```yaml
- name: Log in to Authoritative Registry
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

Use `ORG_PACKAGE_REGISTRY_PAT` only when the workflow genuinely requires organization-wide or cross-repository package access that the repository-scoped `GITHUB_TOKEN` cannot provide.

### 5. Build and publication

The standard publication workflow is maintained in:

```text
templates/ghcr-build-publish.yml
```

The workflow:

- checks out source;
- resolves a lowercase GHCR image path;
- initializes Buildx;
- authenticates only to GHCR;
- builds once;
- pushes SHA and `latest` tags;
- generates SBOM data;
- emits build provenance attestation.

## Package architecture

GHCR is authoritative for container and OCI artifacts. Language package protocols use GitHub Packages' native endpoints because npm, Maven and NuGet are not published directly to GHCR.

| Package class | Target |
|---|---|
| Containers | `ghcr.io/<owner>/<repository>` |
| Helm OCI | `oci://ghcr.io/<owner>/<repository>` |
| Generic OCI artifacts | `ghcr.io/<owner>/<repository>:<artifact-tag>` |
| npm | `https://npm.pkg.github.com` |
| Maven | `https://maven.pkg.github.com/<owner>/<repository>` |
| NuGet | `https://nuget.pkg.github.com/<owner>/index.json` |

These are all part of the GitHub Packages authority. External publication targets require an explicit approved architecture exception.

## Deployment architecture

### Static web properties

Static Skunkworks Academy properties can continue to deploy through their existing static hosting mechanism. The registry policy applies to generated build artifacts only when those artifacts are packaged and published. Static-site deployment does not require containerization merely to satisfy this standard.

### Containerized applications and labs

Containerized applications and lab environments follow this path:

```text
GitHub source
   -> GitHub Actions
   -> GHCR image + SBOM + provenance
   -> approved digest
   -> deployment manifest
   -> runtime platform pulls from GHCR
```

Deployment manifests must use the canonical GHCR path and should pin the digest:

```yaml
image: ghcr.io/skunkworks-academy/example@sha256:<approved-digest>
```

If a tag is required for tooling compatibility, use the immutable commit SHA tag and retain the resolved digest in release evidence.

### Kubernetes pull model

For public packages, Kubernetes nodes may pull anonymously when package visibility permits it.

For private packages, use a dedicated pull credential with minimum `read:packages` scope and reference it using `imagePullSecrets`. Do not reuse a broad developer PAT in cluster manifests.

Example:

```yaml
spec:
  imagePullSecrets:
    - name: ghcr-pull
  containers:
    - name: app
      image: ghcr.io/skunkworks-academy/example@sha256:<approved-digest>
```

The secret object itself must be provisioned through the environment's secret-management mechanism and must never be committed to Git.

## Governance architecture

`skunkworks-academy/academy-validation` is the policy repository.

```text
academy-validation
  |
  +-- rules/registry-policy.json
  +-- scripts/audit-registry-targets.mjs
  +-- templates/registry-governance-consumer.yml
  +-- templates/ghcr-build-publish.yml
  +-- .github/workflows/registry-governance.yml
```

Each deployable repository consumes the shared policy workflow. A non-compliant registry reference fails the required status check.

## Security and supply-chain controls

Required controls for container publication:

- GitHub branch protection / rulesets;
- `packages: write` only in publisher jobs;
- no hardcoded PATs, passwords or cloud registry keys;
- SHA tagging;
- digest-based promotion;
- SBOM generation;
- build provenance attestation;
- dependency review and secret scanning where available;
- base-image mirror policy for production workloads when a closed supply chain is required;
- least-privilege pull credentials for private packages.

## Failure domains and rollback

A release must remain independently identifiable by commit SHA and digest. Rollback therefore means selecting a previously approved digest, not rebuilding an old branch.

```text
Production digest N
      |
      X regression
      |
      v
Select previously approved digest N-1
      |
      v
Redeploy without rebuild
```

This reduces drift and preserves reproducibility.

## Operational ownership

| Layer | Primary responsibility |
|---|---|
| Source repository | Application/lab team |
| Registry policy | Platform / DevOps |
| GHCR package permissions | GitHub organization administrators |
| Build workflow | Repository maintainers under platform standards |
| Runtime pull credentials | Environment/platform administrators |
| Deployment promotion | Release/platform owners |
| Audit evidence | `academy-validation` + GitHub Actions artifacts |

## Migration sequence

1. Inventory all workflows and deployment files.
2. Install registry-governance workflow in each deployable repository.
3. Refactor publishers to GHCR/GitHub Packages.
4. Mirror required production base images when mandated.
5. Publish replacement artifacts using SHA tags.
6. Update manifests to the canonical GHCR path and approved digest.
7. Verify pull permissions in each environment.
8. Remove external registry push paths.
9. Remove obsolete registry credentials.
10. Configure registry governance as a required status check.

## Definition of done

The architecture is fully implemented when:

- no active CI/CD workflow publishes to a foreign registry;
- all container/OCI publications target GHCR;
- protocol-specific packages target GitHub Packages;
- every deployment manifest resolves to an approved GitHub-hosted artifact;
- all deployable repositories enforce the shared policy;
- private runtimes can pull artifacts with least-privilege credentials;
- old external-registry secrets have been removed after verified cutover;
- release provenance and SBOM evidence are retained with each production artifact.
