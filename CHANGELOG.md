## [1.8.1](https://github.com/adobe/helix-rum-enhancer/compare/v1.8.0...v1.8.1) (2023-11-29)


### Bug Fixes

* **navigate:** do not navigate on load ([7873379](https://github.com/adobe/helix-rum-enhancer/commit/7873379bb89b950a0efeb07ff11a89714474bfb6))

# [1.8.0](https://github.com/adobe/helix-rum-enhancer/compare/v1.7.0...v1.8.0) (2023-11-21)


### Bug Fixes

* **navigation:** use correct buffered perf observer ([39ed811](https://github.com/adobe/helix-rum-enhancer/commit/39ed811cdb6ccf5471b30a0d147317c724c4220c))


### Features

* **navigate:** refine checkpoints for `enter`, `navigate`, `reload`, `back_forward`, and `prerender`, track `visibilityState` ([70f622a](https://github.com/adobe/helix-rum-enhancer/commit/70f622a62aa93ff96219420b5c5357348b9ef050))

# [1.7.0](https://github.com/adobe/helix-rum-enhancer/compare/v1.6.0...v1.7.0) (2023-10-31)


### Features

* **checkpoint:**  new loadresource checkpoint ([d818efc](https://github.com/adobe/helix-rum-enhancer/commit/d818efc854241119979300387b3dcd4d59c6c8f5))
* **checkpoint:** introduce new resource checkpoint ([2845a20](https://github.com/adobe/helix-rum-enhancer/commit/2845a202281c09f1c75b4e8a52de000663410b1c))

# [1.6.0](https://github.com/adobe/helix-rum-enhancer/compare/v1.5.0...v1.6.0) (2023-10-18)


### Features

* **cwv:** add support for TTFB ([f987042](https://github.com/adobe/helix-rum-enhancer/commit/f9870425d6bf9135b090d18947e7dc6ad0fa6ca9))

# [1.5.0](https://github.com/adobe/helix-rum-enhancer/compare/v1.4.0...v1.5.0) (2023-09-21)


### Features

* **index:** configurable base url. Adapt to changes in helix-rum-js ([1bb9792](https://github.com/adobe/helix-rum-enhancer/commit/1bb9792f46441d4b17809570f3a018552389515f))
* **index:** enable configurable base url ([3adc4a8](https://github.com/adobe/helix-rum-enhancer/commit/3adc4a8308b86571af5014f6463a4543f3fca857))

# [1.4.0](https://github.com/adobe/helix-rum-enhancer/compare/v1.3.0...v1.4.0) (2023-09-02)


### Features

* **checkpoint:** introduce leave checkpoint ([33abd03](https://github.com/adobe/helix-rum-enhancer/commit/33abd03947b0345200eea1d5857b72a036c09923))

# [1.3.0](https://github.com/adobe/helix-rum-enhancer/compare/v1.2.0...v1.3.0) (2023-08-24)


### Features

* **forms:** improve form instrumentation ([86ecbf5](https://github.com/adobe/helix-rum-enhancer/commit/86ecbf564fe6c04e1d566ac4eeb446d3e6670171))

# [1.2.0](https://github.com/adobe/helix-rum-enhancer/compare/v1.1.4...v1.2.0) (2023-08-18)


### Features

* **checkpoints:** introduce new checkpoint `enter` that gets triggered when a page is first loaded (not refreshed) ([16c3381](https://github.com/adobe/helix-rum-enhancer/commit/16c3381ee564de17fbd6ab8d14a717f9773ca5f6)), closes [#62](https://github.com/adobe/helix-rum-enhancer/issues/62)

## [1.1.4](https://github.com/adobe/helix-rum-enhancer/compare/v1.1.3...v1.1.4) (2023-05-16)


### Bug Fixes

* trigger release ([ffb208e](https://github.com/adobe/helix-rum-enhancer/commit/ffb208e7ec26f1b536df114162efb0f3715ec690))

## [1.1.3](https://github.com/adobe/helix-rum-enhancer/compare/v1.1.2...v1.1.3) (2023-05-16)


### Bug Fixes

* trigger release ([45c7d53](https://github.com/adobe/helix-rum-enhancer/commit/45c7d53c7c8dc9f632abed2011a926c4d9f6aa71))

## [1.1.2](https://github.com/adobe/helix-rum-enhancer/compare/v1.1.1...v1.1.2) (2023-05-16)


### Bug Fixes

* trigger release ([736b3b6](https://github.com/adobe/helix-rum-enhancer/commit/736b3b684c066e62a9a656524a121fd68ede8389))

## [1.1.1](https://github.com/adobe/helix-rum-enhancer/compare/v1.1.0...v1.1.1) (2023-05-16)


### Bug Fixes

* **cwv:** window.webVitals[name] is not a function ([a2d46cb](https://github.com/adobe/helix-rum-enhancer/commit/a2d46cbbf977a59bfe5b3fd179930db75bb3e809))

# [1.1.0](https://github.com/adobe/helix-rum-enhancer/compare/v1.0.2...v1.1.0) (2023-05-11)


### Features

* **cwv:** add INP (Interaction to next paint) as default metric ([b8e2da7](https://github.com/adobe/helix-rum-enhancer/commit/b8e2da7b00887048d9e8874bb896283615cd2072))

## [1.0.2](https://github.com/adobe/helix-rum-enhancer/compare/v1.0.1...v1.0.2) (2023-01-12)


### Bug Fixes

* use node 18 ([#24](https://github.com/adobe/helix-rum-enhancer/issues/24)) ([340485a](https://github.com/adobe/helix-rum-enhancer/commit/340485a6bab72bb70e24dafa54fff22ca916c41e))

## [1.0.1](https://github.com/adobe/helix-rum-enhancer/compare/v1.0.0...v1.0.1) (2022-07-08)


### Bug Fixes

* **cwv:** use correct checkpoint when reporting cwv values, don't load script twice ([56458c8](https://github.com/adobe/helix-rum-enhancer/commit/56458c8e8a34ad93fb547de13ad8ae430e91eaae))

# 1.0.0 (2022-07-08)


### Features

* initial release ([aeef6da](https://github.com/adobe/helix-rum-enhancer/commit/aeef6da48a3de082b9a12537ce92689abeeabb61))
