# Consent-cookie investigation

Observed 2026-11-13. This investigation informed the [consent checkpoint implementation](../README.md#consent-checkpoint), which adds `granted`, `rejected`, and `customized` targets.

## Scope and access

The initial three live OneTrust implementations were inspected through Playwright CLI attached to the existing SLICC Chrome browser over CDP and selected from customer implementation source. After Google Cloud reauthentication, access to `helix-225321.helix_rum` was verified and a one-day query (2026-11-12 UTC) selected further live examples: Canadian Tire, T-Mobile, Enel, Openbank, and Hamleys. Only hostname/provider/banner-state aggregates were retrieved; production traffic counts are not included in this repository document.

Initial observations did not change the user's saved consent choices. Reject, partial-consent, and accept tests on PartsASIST ran in a separate, disposable CDP browser context. The five BigQuery-selected sites were opened in another disposable context, including interaction tests on Enel, Openbank, and Hamleys. Both contexts and their cookies were subsequently destroyed. Only category bits and selected non-identifying status fields were inspected. No full cookies, consent IDs, timestamps, or authentication tokens are included here.

These are observations from one browser/network location, not exhaustive tests of all regional rules. Public source establishes implementation patterns, but is not proof that a particular commit is deployed on production.

## Baseline enhancer behavior before this change

- `plugins/onetrust.js`: `OptanonAlertBoxClosed` means `hidden`; otherwise banner/preference-center visibility determines `show` or `suppressed`.
- `plugins/trustarc.js`: presence of both `notice_gdpr_prefs` and `notice_preferences` means `hidden`; values are not parsed.
- `plugins/usercentrics.js`: presence of localStorage `uc_gcm` means `hidden`; its contents are not parsed. This is **localStorage**, not a cookie.
- All three plugins send once per module lifetime. They do not observe later consent changes.
- `modules/index.js` detects OneTrust from the dismissal cookie or DOM, but not from `OptanonConsent` alone. A stored-state reader should also support cookie-only detection before the SDK renders.
- Only fields in `KNOWN_PROPERTIES` (`modules/defaults.js`) are serialized. Adding arbitrary `groups` or `consentLevel` properties to `sampleRUM` would silently lose them without a coordinated schema change.
- Downstream `rum-distiller/consent.js` separately classifies consent-button clicks into actions such as accept/reject/dismiss. A cookie snapshot is not another click or accept event.

**Banner visibility, enabled categories, and evidence of a recorded interaction are separate dimensions.** The existing `hidden` value proves neither acceptance nor rejection.

## Live OneTrust observations

| Site | SDK version observed | `groups` field (decoded, not the full cookie) | `interactionCount` | Dismissal cookie | Banner |
| --- | --- | --- | --- | --- | --- |
| [PartsASIST](https://www.partsasist.com/) | `202503.2.0` | `C0001:1,C0002:0,C0004:0` | `0` | absent | shown |
| [CME Group education](https://www.cmegroup.com/education) | `202605.1.0` | `C0001:1,C0004:0,C0002:0,C0003:0,C0011:0` | `0` | absent | shown |
| [Intuit ERP](https://erp.intuit.com/) | `202601.2.0` | `1:1,4:1` | `0` | absent | absent |

### PartsASIST: conventional IDs, delayed loading, production-host restriction

[Implementation source](https://github.com/aemsites/vg-partsasist/blob/88ef474f2d5c7bda377769d90436d6bacf96d5e2/scripts/delayed.js):

- Loads `https://cdn.cookielaw.org/scripttemplates/otSDKStub.js` in the delayed phase.
- Uses public configuration ID `078b3e5b-9ab3-4e0f-99e4-1d0b7ff41e53`.
- Only loads the SDK on hosts containing `partsasist.com`; preview hosts intentionally omit it.
- Defines `window.OptanonWrapper` and separately loads GTM.
- The observed preference center exposes `C0001` necessary, `C0002` performance, and `C0004` targeting.

In the disposable context, the following sequence was verified using the real consent controls:

| Action/state | `groups` | Interaction count | Dismissal cookie |
| --- | --- | --- | --- |
| Before interaction | `C0001:1,C0002:0,C0004:0` | `0` | absent |
| Reject All | `C0001:1,C0002:0,C0004:0` | `1` | present |
| Enable Performance only, Save settings | `C0001:1,C0002:1,C0004:0` | `2` | present |
| Accept All | `C0001:1,C0002:1,C0004:1` | `3` | present |

Rejecting all optional categories leaves the group bits identical to the unanswered defaults. Both are classified as `rejected`: this checkpoint describes the stored consent level, not whether a rejection interaction occurred.

Both `OneTrustGroupsUpdated` and `OTConsentApplied` were observed after Reject All. The cookie had already changed when those listeners ran in this SDK version. `OTConsentApplied` arrived later than the immediate post-click read, so a single early read would have missed it. Listen to both and deduplicate; do not overwrite the site's `OptanonWrapper`.

Saving preferences and accepting all caused a page reload in this deployment. Immediately after reload the stored cookie was readable before `window.OneTrust` or its injected DOM existed. This directly supports reading cookies at initialization rather than depending exclusively on SDK globals or callbacks.

`OneTrust.GetDomainData().Groups` contains more categories than the active regional preference center and cookie. It also retained the configured `Status: inactive` for Performance after Performance had been enabled. **Domain configuration is not the visitor's current consent state.**

### CME Group: additional functional category and host-level tokens

[Implementation source](https://github.com/aemsites/cmegroup/blob/2340b7eb3867aa5afd1d6800d0582e390a1699fb/aemedge/scripts/delayed.js):

- Loads the standard OneTrust stub from the delayed script.
- Uses public configuration ID `f42915b0-68e5-491a-a7f7-1db0d962ddff`, matching the live page.
- Live configuration labels `C0003` as First-Party Functional Cookies and `C0011` as Third-Party Functional Cookies.
- `OnetrustActiveGroups` included `H...` host tokens in addition to `C0001`. The cookie's `groups` field provided a narrower category-level representation.

Do not discard `C0011` or assume there are exactly four categories. Do not substitute the active-groups global for the cookie without accounting for its additional host tokens.

### Intuit ERP: numeric IDs and enabled defaults without interaction

[Implementation source](https://github.com/aemsites/intuit-erp/blob/0ff13f36356e52896fcd2d2eba2f20b900080e8c/plugins/tealium-martech/src/index.js):

- Loads the OneTrust stub from `privacy-cdn.a.intuit.com`, then Intuit's consent wrapper, then `gdprUtilBundle.js`.
- Uses public configuration ID `74130b76-29e2-4d72-ab52-09f9ed5818fb`, matching the live page.
- Includes its own `readOptanonConsent()` parser and waits for parseable cookie state before loading Tealium. It also listens for `OneTrustGroupsUpdated`.
- The observed regional preference center uses `1` for Essential Website Cookies and `4` for Advertising (Targeting) Cookies, not `C0001` and `C0004`.
- Its wider domain configuration labels `2` as Performance and Functionality, `3` as Analytics and Customization, and includes additional IDs such as `41`, `42`, `C0018`, and `C0024`. These were not all in the observed cookie.

Both observed bits were enabled while the interaction count was zero and the dismissal cookie was absent. The stored consent level is therefore `granted`, without claiming that the visitor clicked accept-all. Interaction evidence is not required for a sampled consent-level snapshot. Numeric IDs must not be normalized to `C000x` by assumption.

### Canadian Tire: enabled defaults without an interaction counter

The live [Canadian Tire homepage](https://www.canadiantire.ca/en.html), selected from the RUM query, loaded the standard OneTrust stub with public configuration ID `0191bf5a-0f5d-702d-9e03-159316af06c5` and SDK version `202502.1.0`.

- Cookie groups: `C0001:1,C0004:1,C0002:1,C0003:1`.
- No `OptanonAlertBoxClosed` cookie and no `interactionCount` field.
- No banner; the preference-center markup existed.

All applicable groups were enabled, so the stored consent level is `granted` even without evidence of an explicit choice. Missing `interactionCount` must not block classification. The old banner-only plugin reported `suppressed` here; the cookie reader can report the level directly.

T-Mobile was also selected from RUM. Its homepage loaded RUM but did not expose the OneTrust cookie or SDK in this browser observation. This does not establish why other pageviews had OneTrust events, nor prove absence across its routes or regional configurations.

## Other providers: documentation and live validation

### TrustArc

The [vendor technical specification](https://trustarchelp.zendesk.com/hc/en-us/articles/53492086194963-Cookie-Consent-Manager-Technical-Specifications-Guide) describes different formats:

- `notice_gdpr_prefs` lists approved category numbers, e.g. `0,1,2:`. Consent-resolution suffixes can extend this to `0,1,2::expressed,eu`.
- `notice_preferences` is the legacy inclusive slider level: `0` required, `1` functional, `2` advertising, and `3+` custom buckets. It is not an independent bitset.
- `notice_behavior` describes the configured regional notice mode, not whether the visitor took an affirmative action.
- Tracker-specific opt-outs can differ from category-level state. Category snapshots must not claim all vendors in an enabled category are enabled.

Parse the documented preference portion only; do not copy suffixes, regional values, timestamps, or UID cookies. Prefer granular preferences when available, and validate legacy-slider fallback separately. Do not assume every customer has the same number of custom buckets.

#### Enel: live rejection and partial consent

The [Enel homepage](https://www.enel.it/it-it) loads `consent.trustarc.com/notice` and `asset/notice.js`. The clean browser initially showed the banner with neither preference cookie present.

| Action | `notice_gdpr_prefs` preference portion | `notice_preferences` preference portion |
| --- | --- | --- |
| Continue without accepting | `0` | `0` |
| Enable analytics, leave advertising disabled, submit preferences | `0,1` | `1` |

The page labels bucket `1` **Cookie analitici**, rather than the generic documentation's Functional label. Thus even TrustArc's category semantics need site-aware mapping; retain the category number instead of universally relabeling it. Both preference cookies were readable from the top-level document after the real UI actions.

### Usercentrics

The [vendor's GTM template](https://github.com/Usercentrics/gtm-templates-usercentrics-cmp/blob/main/template.tpl) reads localStorage `uc_gcm` JSON and uses these properties:

- `adStorage`
- `analyticsStorage`
- `adPersonalization`
- `adUserData`

Values feed Google Consent Mode (`granted`/`denied`). This is a subset of consent signals, not necessarily the complete Usercentrics service/category decision or proof of explicit interaction. A future reader should accept only known keys/values, catch malformed JSON and denied storage access, and never forward the entire object.

#### Openbank: Google Consent Mode storage present after rejection

The live [Openbank homepage](https://www.openbank.de/) loaded Usercentrics UI `3.113.0` and SDK `4.66.2`, with public settings ID `jBQVAAZ_9`.

- Before interaction, its shadow-root banner was visible and `uc_gcm` was absent.
- Clicking **Alle ablehnen** hid the banner and created `uc_gcm`, with all four documented signals set to `denied`.

This verifies that `uc_gcm` presence cannot mean acceptance: it also represents rejection.

#### Hamleys: no `uc_gcm`, but customer-defined category cookies

The live [Hamleys homepage](https://www.hamleys.com/) loaded Usercentrics UI `3.113.0`, with public settings ID `YXJdSJPySRDK4E`.

- Before interaction, the banner was visible and `uc_gcm` was absent.
- Clicking **ACCEPT** hid the banner, but `uc_gcm` remained absent.
- Five first-party cookies were present with literal `true` values: `uc_consent_status_functional`, `uc_consent_status_marketing`, `uc_consent_status_analytics`, `uc_consent_status_personalisation`, and `uc_consent_status_essential`.
- An injected GTM script explicitly writes these cookies and pushes a `consent_status_update` data-layer event. These are **customer integration cookies**, not evidence of a universal Usercentrics cookie format.
- Standard localStorage `uc_settings` was present. Structural inspection found `services[].status` booleans, but also controller IDs and consent-history timestamps. No identifying values were exported.

A generic implementation must not depend solely on `uc_gcm`, assume these five Hamleys cookies exist everywhere, or forward `uc_settings`. Supporting complete Usercentrics state needs a vetted reader for its documented service storage, or explicit integration-specific category-cookie mappings. The legacy banner plugin can classify an accepted Hamleys visit as `suppressed` once its UI is gone because it only recognizes `uc_gcm` as stored state. The exact cause of each historical `suppressed` event remains unproven.

## Implemented checkpoint contract

The requested contract is three new **target values on the existing `consent` checkpoint**, not a new checkpoint, new payload fields, or versioned state strings:

- `granted`: all supported optional categories/signals enabled.
- `rejected`: all supported optional categories/signals disabled.
- `customized`: a mix of enabled and disabled optional categories/signals.

Provider sources remain unchanged. A recognized stored level replaces the old banner-only target for that page; otherwise `show`, `hidden`, and `suppressed` remain fallback values. No cookie contents, IDs, counters, timestamps, or per-category bits are sent. Since the enhancer runs on sampled pageviews, classification does not require observation of a consent interaction or an interaction-evidence marker.

The implementation retains the existing once-per-page snapshot. `OptanonConsent`-only and supported Usercentrics category-cookie-only discovery work before SDK initialization. Change-event listeners are not part of this change.

Classification remains provider-specific:

- OneTrust reads `groups` without requiring a dismissal cookie or consulting `interactionCount`. Pending reconsent remains unclassified. It excludes the necessary `C0001` or numeric `1` group and requires at least one optional category. Other necessary-category schemes remain unsupported.
- TrustArc supports the standard three-bucket schema, preferring the granular list over the legacy slider. Custom bucket values are left unclassified; the cookie does not enumerate all denied custom buckets, so this is not a general custom-schema decoder.
- Usercentrics uses complete GCM signals, or the explicitly supported category-cookie integration observed at Hamleys when GCM storage is absent. It ignores `uc_user_interaction`, does not read full `uc_settings`, and does not infer arbitrary cookie-prefix semantics. GCM results describe those four signals, not every service configured in the CMP.

Malformed or incomplete values, duplicate category IDs/cookies, blocked storage, and unsupported formats fall back rather than inventing a grant or rejection. Inputs are bounded and only fixed target strings leave the parsers. The existing collector checkpoint and payload-field schemas remain unchanged.

### Regression coverage

- PartsASIST unanswered vs rejected: identical groups produce the same `rejected` level regardless of interaction evidence.
- All three levels are reported without a dismissal cookie, with absent/zero/invalid interaction counters, and with `uc_user_interaction=false`.
- Stored partial and all-enabled state before the SDK exists.
- Intuit numeric IDs, enabled defaults, no dismissal cookie.
- CME custom `C0011` and differences between domain configuration, active globals, and cookie categories.
- Reconsent flag with previously enabled groups; never report an unqualified fresh grant.
- No cookie, empty cookie, invalid escaping, invalid bits, duplicate IDs, reordered groups, overlong input, and denied cookie/storage access.
- Repeated initialization still emits exactly one event; separate iframe realms test new-page snapshots.
- Exact cookie-name matching and unrelated cookies containing identifiers: no accidental inclusion in telemetry.
- TrustArc granular vs legacy formats, suffix stripping, custom buckets, and conflicting values.
- Usercentrics valid/partial/invalid `uc_gcm`, unknown keys, denied storage access, missing shadow-root UI, and completed interaction without `uc_gcm` (Hamleys).
- Canadian Tire's missing interaction counter and Enel's site-specific category labels.
- Customer-defined consent-cookie mappings must be opt-in or explicitly supported, not guessed from an arbitrary prefix.
- Existing banner-state tests remain unchanged; the new targets survive provider discovery and the actual beacon serializer without any raw consent data.

## BigQuery and ingestion findings

- `helix_rum.cluster_all` is a `UNION ALL` of `cluster` and `cluster_cloudflare`. Both backing tables are partitioned daily on `time` and clustered by `hostname`.
- The live schema has `checkpoint`, `source`, and `target` string columns. It does not have arbitrary consent-level/category columns.
- A dry run of the 2026-11-12 UTC hostname aggregation estimated 15,722,888,453 bytes. Two read-only executions each used a 25 GiB cap and processed two partitions: the second retrieved the full aggregate result after the first CLI output limit omitted the recognized providers. Neither execution hit the query cache; each processed 15,722,888,453 bytes. The revised allowlisted query was separately dry-run validated.
- The raw provider field contained scanner-like strings, not just CMP names. These values were treated as untrusted data, excluded from customer selection, and are not copied into repository artifacts. The reusable [query](queries/consent-hosts.sql) restricts providers and the six known consent target values explicitly.
- Rankings use sampled event counts; `SUM(weight)` is a weighted event estimate, **not** a unique-visitor count or consent-grant rate. Existing `hidden`/`suppressed` events cannot answer what consent was granted.
- [Collector source at `3da9395`](https://github.com/adobe/helix-rum-collector/blob/3da93958e2c2e3d5dbcaf939ef0ef3af0d19e886/src/utils.mjs) explicitly allows `consent` but not `consentstate`. The Google logger validates checkpoints and sanitizes `source`/`target`. Local bundler inspection shows generic events retain these fields. No new telemetry payload was submitted to production to test this.

Example dry run of the reusable query:

```sh
bq --project_id=helix-225321 --location=US query \
  --use_legacy_sql=false --dry_run \
  --maximum_bytes_billed=26843545600 \
  --parameter='start_time:TIMESTAMP:2026-11-12 00:00:00+00' \
  --parameter='end_time:TIMESTAMP:2026-11-13 00:00:00+00' \
  < docs/queries/consent-hosts.sql
```

Remove `--dry_run` only after reviewing the estimate. No raw production traffic counts or individual RUM rows are stored in this repository.

## Out of scope / future work

- Same-page consent-change notifications and revocation events; this change preserves the original snapshot timing.
- General custom necessary-category mappings and custom TrustArc bucket universes.
- Usercentrics service-level storage beyond GCM and the specifically supported category cookies.
- Additional geographic variants. No new telemetry was injected into production to test the collector.

Do not select page/session identifiers, full URLs with query strings, or user-level rows for this investigation; hostname-level aggregates are sufficient.
