# Skunkworks Academy Validation

Shared QA and governance checks for Skunkworks Academy repositories.

## Commands

```bash
npm run validate
npm run audit:global-nav -- /path/to/repo-or-organisation-checkout
npm run audit:registry
```

## Authoritative artifact registry rule

Skunkworks Academy uses GitHub Packages as the package authority and `ghcr.io` as the canonical container and OCI registry.

Canonical container image identity:

```text
ghcr.io/${{ github.repository_owner }}/${{ github.event.repository.name }}:<tag>
```

Authentication must use `${{ secrets.GITHUB_TOKEN }}` by default or `${{ secrets.ORG_PACKAGE_REGISTRY_PAT }}` only where organization-scoped or cross-repository package access requires it.

Machine-readable policy: [`rules/registry-policy.json`](./rules/registry-policy.json)

Registry audit engine: [`scripts/audit-registry-targets.mjs`](./scripts/audit-registry-targets.mjs)

Consumer workflow: [`templates/registry-governance-consumer.yml`](./templates/registry-governance-consumer.yml)

Standard GHCR publisher: [`templates/ghcr-build-publish.yml`](./templates/ghcr-build-publish.yml)

Architecture documentation: [`docs/build-and-deployed-architecture.md`](./docs/build-and-deployed-architecture.md)

Audit and migration report: [`docs/registry-consolidation-audit.md`](./docs/registry-consolidation-audit.md)

Every deployable repository should install the registry-governance consumer workflow and configure the resulting status check as required on `main`.

## Mandatory global navigation rule

Every public Skunkworks Academy website, application shell and generated standalone page must load the central v10 navigation asset:

```html
<script defer src="https://skunkworksacademy.com/assets/academy-navigation.js?v=2026.08.15.1" data-skunkworks-global-nav="v10"></script>
```

The central asset owns:

- the organisation-wide canonical header;
- a persistent desktop top-menu navigation row on every public page;
- mobile/tablet burger-menu behaviour when the persistent row is collapsed;
- the Skunkworks Academy logo icon, including light and dark variants;
- navigation labels, destination URLs, active-page state and responsive styling;
- canonical search and sign-in controls;
- removal or reconciliation of legacy duplicate top-level navigation;
- loading of the canonical footer and public design system.

The persistent top menu currently exposes the highest-frequency public destinations directly: Home, Catalogue, Labs, Microsoft, IBM, Security, Badging, Jobs and Blog. The full destination set remains available through the canonical menu/search controls.

Repositories must not introduce independent top-level header navigation, navbar markup, logo-switching logic or burger-menu implementations. Product-specific secondary navigation is allowed beneath the canonical global bar when it is clearly scoped to the current application. Intentionally local authenticated application chrome may be preserved only where the public-shell preservation contract permits it.

## Required consumer workflow

Copy [`templates/global-navigation-consumer.yml`](./templates/global-navigation-consumer.yml) into each website repository as:

```text
.github/workflows/global-navigation.yml
```

The workflow checks every pull request and push to `main`. A non-compliant page causes the check to fail and should be configured as a required status check in the repository branch ruleset.

## Repository ruleset requirement

For each deployable web repository, configure a branch ruleset for `main` with:

1. pull requests required before merge;
2. the `global-navigation` job required to pass;
3. the `registry-governance` job required to pass for repositories that build or deploy artifacts;
4. branch updates required before merge;
5. bypass restricted to designated Academy platform administrators.

## Canonical configuration

Machine-readable navigation rules, logo URLs, blocked local-header patterns and canonical destinations are stored in [`rules/global-navigation.json`](./rules/global-navigation.json). Update that file and the central `www/assets/academy-navigation.js` implementation together whenever the menu changes.
