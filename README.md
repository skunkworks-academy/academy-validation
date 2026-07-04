# Skunkworks Academy Validation

Shared QA checks for Skunkworks Academy repositories.

## Commands

```bash
npm run validate
npm run audit:global-nav -- /path/to/repo-or-organisation-checkout
```

## Global navigation rule

All public Skunkworks Academy web surfaces must use the central global navigation asset:

```html
<script defer src="https://skunkworksacademy.com/assets/academy-navigation.js?v=2026.07.04"></script>
```

The central asset owns the organisation top menu, burger interaction, logo icons, layout, and theme. Individual repositories should not maintain separate header navigation blocks, navbar markup, logo icon switching, or burger-menu implementations.
