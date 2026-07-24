# Skunkworks Academy Validation

Shared QA and governance checks for Skunkworks Academy repositories.

## Commands

```bash
npm run validate
npm run audit:global-nav -- /path/to/repo-or-organisation-checkout
```

## Mandatory global navigation rule

Every public Skunkworks Academy website, application shell and generated page must load the central navigation asset:

```html
<script defer src="https://skunkworksacademy.com/assets/academy-navigation.js?v=2026.07.17.6"></script>
```

The central asset owns:

- the organisation-wide top menu and mobile burger behaviour;
- the Skunkworks Academy logo icon, including light and dark variants;
- navigation labels, destination URLs, active-page state and responsive styling;
- removal or reconciliation of legacy duplicate top-level navigation.

Repositories must not introduce independent top-level header navigation, navbar markup, logo-switching logic or burger-menu implementations. Product-specific secondary navigation is allowed beneath the canonical global bar when it is clearly scoped to the current application.

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
3. branch updates required before merge;
4. bypass restricted to designated Academy platform administrators.

## Canonical configuration

Machine-readable rules, logo URLs, blocked local-header patterns and canonical destinations are stored in [`rules/global-navigation.json`](./rules/global-navigation.json). Update that file and the central `www/assets/academy-navigation.js` implementation together whenever the menu changes.
