# Helix RUM Enhancer

> Add advanced functionality to Helix RUM Collection (client-side)

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-rum-enhancer.svg)](https://codecov.io/gh/adobe/helix-rum-enhancer)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe/helix-rum-enhancer.svg)](https://circleci.com/gh/adobe/helix-rum-enhancer)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-rum-enhancer.svg)](https://github.com/adobe/helix-rum-enhancer/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-rum-enhancer.svg)](https://github.com/adobe/helix-rum-enhancer/issues)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe/helix-rum-enhancer.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe/helix-rum-enhancer)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Usage

This library is meant to be used in conjunction with and loaded by the `sampleRUM` function found in [Helix Project Boilerplate](https://github.com/adobe/helix-project-boilerplate/blob/main/scripts/scripts.js) or [Helix RUM JS](https://github.com/adobe/helix-rum-js).

It will add following new checkpoints:

- `cwv`: Core Web Vitals Collection
- `click`: A click anywhere in the document
- `viewblock`: A Helix block has been scrolled into the viewport
- `viewmedia`: An image or video hosted by Helix Media Bus has been scrolled into the viewport
- `enter`: when page loads and the referrer is different than the current page.
- `assetclick`: A click in the document which can be associated with a proximal image or video in the DOM.

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
