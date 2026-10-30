# Organisation artifact-registry audit credential recovery

## Observed incident
Scheduled `Organization Artifact Registry Audit` failed on 28–30 October 2026. The 30 October Actions log reported `gh: Bad credentials (HTTP 401)` during "Verify organization audit credential", before any private repository was audited. This is an **authentication outage of the audit**, not proof that repositories are clean or unhealthy.

## Administrator steps
1. Navigate to **skunkworks-academy/academy-validation → Settings → Secrets and variables → Actions**. Locate `ORG_PACKAGE_REGISTRY_PAT`. Do not paste secrets into issues, pull requests, logs or ChatGPT.
2. Review the token owner, expiry, organisation access and any required SSO/organisation approval. Rotate or reinstall a suitable least-privileged credential; prefer an organisation-managed GitHub App token for long-lived automation, with repository metadata/contents and package read permission scoped to audited resources.
3. Replace the secret with the new token. Do not downgrade to the default repository GITHUB_TOKEN: that may silently omit private repositories.
4. Run **Actions → Organization Artifact Registry Audit → Run workflow**.
5. Confirm: credential verification, full organisation audit, generated JSON and migration matrix, and uploaded evidence artifacts. Record the verified repository count and date.
6. Configure credential-expiry alerting and rotation ownership. Revoke the invalid credential after the replacement works.

The workflow fails closed and publishes a clear GitHub Actions step summary when a token is missing, invalid, or cannot enumerate the required organisation. No bypass, secret access or audit-result fabrication is implemented.
