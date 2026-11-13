# Helix RUM Enhancer

> Add advanced functionality to Helix RUM Collection (client-side)

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-rum-enhancer.svg)](https://codecov.io/gh/adobe/helix-rum-enhancer)
[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/adobe/helix-rum-enhancer/main.yaml)](https://github.com/adobe/helix-rum-enhancer/actions/workflows/main.yaml)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-rum-enhancer.svg)](https://github.com/adobe/helix-rum-enhancer/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-rum-enhancer.svg)](https://github.com/adobe/helix-rum-enhancer/issues)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Usage

This library is meant to be used in conjunction with and loaded by the `sampleRUM` function found in [Helix Project Boilerplate](https://github.com/adobe/helix-project-boilerplate/blob/main/scripts/scripts.js) or [Helix RUM JS](https://github.com/adobe/helix-rum-js).

It will add following new checkpoints:

- `cwv`: Core Web Vitals Collection
- `pagesviewed`: number that helps to estimate how many pages are seen in average by a user.
- `click`: A click anywhere in the document
- `viewblock`: A Helix block has been scrolled into the viewport
- `viewmedia`: An image or video hosted by Helix Media Bus has been scrolled into the viewport
- `reload`, `navigate`, `enter`: depending on how the current page was accessed
- `formsubmit`: when a form is submitted
- `consent`: stored consent choice, or consent-banner state when the choice is unknown

### Consent checkpoint

Consent plugins emit `sampleRUM('consent', { source, target })`, where `source` is
`onetrust`, `trustarc`, or `usercentrics`. A recognized stored choice produces:

| `target` | Meaning |
| --- | --- |
| `granted` | All supported optional categories/signals are enabled. |
| `rejected` | All supported optional categories/signals are disabled. |
| `customized` | Some supported optional categories/signals are enabled and others disabled. |

Required cookies do not count as optional consent. If the stored choice cannot be
classified, the existing `show`, `hidden`, or `suppressed` banner-state fallback
is retained. In particular, `hidden` does not mean `granted`.

Supported formats:

- **OneTrust:** `OptanonConsent.groups`, including standard `Cdddd` and numeric IDs.
  `C0001` or `1` identifies the necessary group; at least one optional group is required.
  A nonempty `OptanonAlertBoxClosed` cookie or a positive `interactionCount` is required
  to distinguish a recorded choice from defaults. Pending reconsent and malformed
  values are not classified as a choice.
- **TrustArc:** standard three-bucket `notice_gdpr_prefs` (required `0`, optional `1`
  and `2`), with the inclusive `notice_preferences` slider as a fallback only when
  granular preferences are absent. Custom buckets/levels are not interpreted.
- **Usercentrics:** the four `uc_gcm` localStorage signals (`adStorage`,
  `analyticsStorage`, `adPersonalization`, `adUserData`). If absent, the explicitly
  supported `uc_consent_status_*` category-cookie integration is read: essential
  must be `true` and functional, marketing, analytics, and personalisation must all
  contain boolean strings. This integration is not present on every Usercentrics site.
  An explicit `uc_user_interaction=false` prevents choice classification.

The plugins retain their **once-per-page snapshot** behavior; they do not listen
for subsequent consent changes on that page. No raw cookie values, category IDs,
controller IDs, or interaction timestamps are transmitted. These values describe
supported stored preferences, not individual button clicks or legal consent validity.
See the [customer-site investigation](docs/consent-cookie-research.md) for examples
and limitations.

### The `source` parameter and the `sourceSelector`

The `source` parameter is a string that can be used to identify the source of the event. It can be used to identify the source of the event, e.g. a button, a link, a form, etc.
It represents an idealized CSS selector that is both human-readable and specific enough to identify the source of the event in the document, even when not having access to the
orginal document. It is idealized because it pretends the DOM would use modern HTML with concise semantics, even if the actual document uses `class` values for things that would
be better represented by semantic HTML elements.

The `sourceSelector` function is a function that takes a DOM element and returns a descriptive `source` parameter. If the element has a `data-rum-source` attribute, its value is used as the `source` parameter. Otherwise, the function tries to generate a `source` parameter based on the element's tag name, class names, and text content.

The structure of the `source` parameter is as follows:

```
<context> <element>#<identifier>
```
All three parts are optional

`context` is
- `form` for form elements
- `dialog` for dialog elements, or parent containers that are fixed positioned and have a positive high z-index
- `.block-name` for Helix blocks
- `header`, `footer`, `nav`, `aside`  for main site structure
- `#id` as a fallback, if a container ID is available

`element` is
- `button` for buttons, or links that look like buttons (e.g. with a class `button` or `btn` or `cta`)
- `img` for images
- `video` for videos
- `a` for links that are not buttons
- `input[type="text"]` for input elements (all types are supported)
- `select`, `textarea`, etc. for other form elements

`identifier` is
- the `id` attribute of the element, if provided
- the first `.class` if there are any
- else omitted

Even if an `identifier` is provided, having a `context` and `element` is recommended, as it makes the `source` parameter more readable and easier to understand.


## Development

### Build

```bash
$ npm install
```

### Test

```bash
$ npm test
```

### Lint

```bash
$ npm run lint
```
### Cutting a Pre-Release

Releases are handled by [semantic-release](https://github.com/semantic-release/semantic-release), and will happen automatically when a PR is merged into the `main` or the `1.x` branch. By merging into `beta`, a pre-release will be created.