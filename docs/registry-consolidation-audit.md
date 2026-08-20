# Skunkworks Academy Artifact Registry Consolidation Audit

**Policy:** SKW-PLATFORM-REGISTRY-001  
**Authoritative container/OCI registry:** `ghcr.io`  
**Authoritative namespace:** `${{ github.repository_owner }}`  
**Default authentication:** `${{ secrets.GITHUB_TOKEN }}`; use `${{ secrets.ORG_PACKAGE_REGISTRY_PAT }}` only where cross-repository or organization-scoped package access requires it.

## Executive summary

Skunkworks Academy is standardizing artifact publication on the GitHub Packages platform. Container images, Helm OCI charts and generic OCI artifacts must publish to GitHub Container Registry (GHCR). npm, Maven and NuGet packages must use their protocol-specific GitHub Packages endpoints because those package protocols do not publish directly to `ghcr.io`.

The connector-accessible audit found an existing GHCR deployment reference in `skunkworks-academy/labs` and did not return indexed matches for Docker Hub, AWS ECR, Google Artifact Registry, Azure Container Registry, `docker push`, `docker/login-action`, `docker/build-push-action`, `DOCKER_HUB_TOKEN` or `AWS_ACCESS_KEY_ID` in the organization searches performed during this consolidation pass.

This result is encouraging but is not treated as proof that all organization repositories are clean. GitHub code-search indexing and connector installation scope can omit files or private repositories. For that reason, the policy is implemented as executable validation in `academy-validation` and is intended to be installed as a required workflow in every deployable repository.

## Confirmed finding

| Repository | File | Finding | Status |
|---|---|---|---|
| `skunkworks-academy/labs` | `labs/linux-cli-101/manifest.yaml` | Uses GHCR, but the image path is nested as `ghcr.io/skunkworks-academy/labs/linux-cli-101:...` rather than the standardized repository image name `ghcr.io/skunkworks-academy/labs:<tag>`. | Migration required |

## Registry authority matrix

| Artifact class | Authoritative target | Notes |
|---|---|---|
| Container images | `ghcr.io/${owner}/${repository}:${tag}` | Lowercase path; immutable SHA tag required. |
| Helm charts | `oci://ghcr.io/${owner}/${repository}` | Publish as OCI. |
| Generic build bundles | `ghcr.io/${owner}/${repository}:${artifact-tag}` | Use OCI/ORAS where a registry-backed generic artifact is required. |
| npm packages | `https://npm.pkg.github.com` | GitHub Packages protocol endpoint. |
| Maven packages | `https://maven.pkg.github.com/${owner}/${repository}` | GitHub Packages protocol endpoint. |
| NuGet packages | `https://nuget.pkg.github.com/${owner}/index.json` | GitHub Packages protocol endpoint. |

## Enforcement rules

1. No workflow may authenticate to or push to Docker Hub, ECR, GAR/GCR, ACR, Quay, GitLab Registry, Nexus or Artifactory without a formally approved architecture exception.
2. `docker/login-action` must use `registry: ghcr.io`, `username: ${{ github.actor }}`, and either `${{ secrets.GITHUB_TOKEN }}` or `${{ secrets.ORG_PACKAGE_REGISTRY_PAT }}`.
3. Container build outputs must be tagged with the repository SHA. `latest` may be added as a moving convenience tag on the protected default branch only.
4. Deployment manifests should consume immutable digests where possible. Tags are discovery labels, not the final deployment trust anchor.
5. Base images used for production builds should be mirrored into GHCR when the organization requires a fully closed supply chain. The audit engine flags non-GHCR `FROM` images so that mirror work is explicit.
6. Raw PATs, cloud access keys and registry passwords are prohibited from source files.
7. Legacy registry credential names are treated as migration findings even when the underlying secret value is not visible to the workflow.

## Validation implementation

The source of truth is `rules/registry-policy.json`.

The executable control is:

```bash
npm run audit:registry
```

It scans workflow and deployment configuration for:

- foreign registry hosts;
- non-GHCR Docker pushes and logins;
- foreign Helm OCI targets;
- deployment `image:` references outside GHCR;
- non-GHCR Dockerfile base images;
- npm/Maven/Gradle publication targets outside GitHub Packages;
- legacy registry secret names;
- obvious hardcoded GitHub PATs and AWS access key identifiers.

Each consumer repository should copy `templates/registry-governance-consumer.yml` to `.github/workflows/registry-governance.yml` and configure the resulting job as a required status check on `main`.

## Cleanup candidates

The following secret names should be removed from repository or organization settings after confirming they are no longer referenced by active deployments:

- `DOCKER_HUB_TOKEN`
- `DOCKERHUB_TOKEN`
- `DOCKERHUB_USERNAME`
- `ECR_REGISTRY`
- `ECR_REPOSITORY`
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` when used solely for ECR
- `GCP_ARTIFACT_REGISTRY_KEY`
- `GOOGLE_APPLICATION_CREDENTIALS` when used solely for GAR/GCR
- `ACR_USERNAME`
- `ACR_PASSWORD`
- `NEXUS_USERNAME`
- `NEXUS_PASSWORD`
- `ARTIFACTORY_USERNAME`
- `ARTIFACTORY_PASSWORD`

Do not delete credentials that still support unrelated infrastructure. Secret removal is the last step after dependency tracing, cutover and pull verification.

## Completion criteria

The consolidation is complete when every deployable repository has the registry-governance workflow enabled, every production artifact is published to GitHub Packages, deployment manifests pull from the approved GitHub target, pull permissions are verified, and no open audit finding remains without an approved exception.
