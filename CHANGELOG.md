## [2.7.6](https://github.com/adobe/helix-rum-enhancer/compare/v2.7.5...v2.7.6) (2024-05-21)


### Bug Fixes

* no type leads to empty checkpoint ([#167](https://github.com/adobe/helix-rum-enhancer/issues/167)) ([c1d41ad](https://github.com/adobe/helix-rum-enhancer/commit/c1d41ad084fd9e0e71b3bea7aff54e543ee45953))

## [2.7.5](https://github.com/adobe/helix-rum-enhancer/compare/v2.7.4...v2.7.5) (2024-05-14)


### Bug Fixes

* in case window.hlx exists but window.hlx.rum is undefined ([581653b](https://github.com/adobe/helix-rum-enhancer/commit/581653b8e4e3e28c0c8de314454025cd8dbf4618))

## [2.7.4](https://github.com/adobe/helix-rum-enhancer/compare/v2.7.3...v2.7.4) (2024-05-02)


### Bug Fixes

* catch potential exceptions and errors ([99ab83e](https://github.com/adobe/helix-rum-enhancer/commit/99ab83eae7ebc3a2c27df7887a57f58307e6ca61))

## [2.7.3](https://github.com/adobe/helix-rum-enhancer/compare/v2.7.2...v2.7.3) (2024-04-22)


### Bug Fixes

* no lcp target text from missing element ([#161](https://github.com/adobe/helix-rum-enhancer/issues/161)) ([0b75e80](https://github.com/adobe/helix-rum-enhancer/commit/0b75e8080b0950dfa0298920e632d61e712563ed))

## [2.7.2](https://github.com/adobe/helix-rum-enhancer/compare/v2.7.1...v2.7.2) (2024-04-18)


### Bug Fixes

* exclude utm_term from collection ([732c647](https://github.com/adobe/helix-rum-enhancer/commit/732c64746a238c8726f6a14d2025778880611f86)), closes [#153](https://github.com/adobe/helix-rum-enhancer/issues/153)
* exclude utm_term from collection ([545a168](https://github.com/adobe/helix-rum-enhancer/commit/545a168da34cf58a3f84be84545d0692827ee98b))

## [2.7.1](https://github.com/adobe/helix-rum-enhancer/compare/v2.7.0...v2.7.1) (2024-04-18)


### Bug Fixes

* make targetselector null safe ([#156](https://github.com/adobe/helix-rum-enhancer/issues/156)) ([691d40d](https://github.com/adobe/helix-rum-enhancer/commit/691d40d1659d6aaac81f4037e11c243341181b80))

# [2.7.0](https://github.com/adobe/helix-rum-enhancer/compare/v2.6.0...v2.7.0) (2024-04-18)


### Features

* add logic to capture target from wrapping anchor tag ([2a733b3](https://github.com/adobe/helix-rum-enhancer/commit/2a733b307d00c1a0613f645a01e325e683734625))

# [2.6.0](https://github.com/adobe/helix-rum-enhancer/compare/v2.5.0...v2.6.0) (2024-04-16)


### Features

* **resources:** add missingresource checkpoint behind feature toggle ([a9ba59d](https://github.com/adobe/helix-rum-enhancer/commit/a9ba59dccc4712571530fd785bb9aa6cc277bea8))

# [2.5.0](https://github.com/adobe/helix-rum-enhancer/compare/v2.4.1...v2.5.0) (2024-04-16)


### Features

* report source and target along with lcp element ([bebb429](https://github.com/adobe/helix-rum-enhancer/commit/bebb4291a1cc5fe07af31f87988c84ba07e57695))

## [2.4.1](https://github.com/adobe/helix-rum-enhancer/compare/v2.4.0...v2.4.1) (2024-04-08)


### Bug Fixes

* broken code in the utm tracking ([d1695dd](https://github.com/adobe/helix-rum-enhancer/commit/d1695ddf62b316d3cc06c75c444f859a271cff2e))

# [2.4.0](https://github.com/adobe/helix-rum-enhancer/compare/v2.3.1...v2.4.0) (2024-03-22)


### Features

* track UTM query parameters ([2c237e5](https://github.com/adobe/helix-rum-enhancer/commit/2c237e5361ea2f166a0c37b1b752feda30ae9293)), closes [#137](https://github.com/adobe/helix-rum-enhancer/issues/137)
* track UTM query parameters ([ed58621](https://github.com/adobe/helix-rum-enhancer/commit/ed586215611c492adb29e5a98cadca3bd140d429))
* track UTM query parameters ([d1a6552](https://github.com/adobe/helix-rum-enhancer/commit/d1a6552a9b661867c0bfde06bcd066b4a1ed9024))

## [2.3.1](https://github.com/adobe/helix-rum-enhancer/compare/v2.3.0...v2.3.1) (2024-03-11)


### Bug Fixes

* add json type header to beacon ([a1e0807](https://github.com/adobe/helix-rum-enhancer/commit/a1e0807f735a7c8097c588f401efdb9aac08dfc7))

# [2.3.0](https://github.com/adobe/helix-rum-enhancer/compare/v2.2.0...v2.3.0) (2024-03-06)


### Features

* **minirum:** allow different base urls for collection and extra scripts ([c32c7b9](https://github.com/adobe/helix-rum-enhancer/commit/c32c7b9c3f7838ced71e372889fb618b3befe098))

# [2.2.0](https://github.com/adobe/helix-rum-enhancer/compare/v2.1.1...v2.2.0) (2024-03-04)


### Features

* **sourceselector:** highlight clicks on buttons and CTAs ([2bc8dc5](https://github.com/adobe/helix-rum-enhancer/commit/2bc8dc531ef31e9ae08daebdd428a98a493c0f9e))

## [2.1.1](https://github.com/adobe/helix-rum-enhancer/compare/v2.1.0...v2.1.1) (2024-02-28)


### Bug Fixes

* **cwv:** only report LCP and CLS eagerly ([9d44949](https://github.com/adobe/helix-rum-enhancer/commit/9d44949701865242ac44255d5080f52b22be2b72))
* **cwv:** report metrics eagerly ([4cfcad9](https://github.com/adobe/helix-rum-enhancer/commit/4cfcad9e8271a2a3c4571db419e26857b72d0c6d))
* **cwv:** small change ([542fd6a](https://github.com/adobe/helix-rum-enhancer/commit/542fd6a050fdb911b4fb5faad7f83d0843af4d1e))
* **cwv:** small change ([3a41b52](https://github.com/adobe/helix-rum-enhancer/commit/3a41b52676484d44585e8b0debe7352fe7a2e5ac))

# [2.1.0](https://github.com/adobe/helix-rum-enhancer/compare/v2.0.0...v2.1.0) (2024-01-22)


### Bug Fixes

* **loadresource:** enable loadresource checkpoint for all origins ([0be8de7](https://github.com/adobe/helix-rum-enhancer/commit/0be8de7ee3e57afdd60a2b9af743bedd061e907d))


### Features

* **observer:** enable tracking of JSON loading for all browsers that have a PerformanceObserver implementation ([45b5e64](https://github.com/adobe/helix-rum-enhancer/commit/45b5e6428fb9c51e8fc4d477c574d44a361b3ec2))

# [2.0.0](https://github.com/adobe/helix-rum-enhancer/compare/v1.9.1...v2.0.0) (2024-01-16)


### Features

* prepare compatibility with @adobe/helix-rum-js@2 ([b1cef07](https://github.com/adobe/helix-rum-enhancer/commit/b1cef07ec59c8134056a9aaf25a331016aeffe39))
* prepare compatibility with @adobe/helix-rum-js@2 ([702a873](https://github.com/adobe/helix-rum-enhancer/commit/702a8731d783850d26b2daae3a839e7ee4192e47))


### BREAKING CHANGES

* this version can only be used from helix-rum-js@v2 and up
* this version can only be used from helix-rum-js@v2 and up

## [1.9.1](https://github.com/adobe/helix-rum-enhancer/compare/v1.9.0...v1.9.1) (2024-01-11)


### Bug Fixes

* correct prefix check for relative urls in targets. fixes [#102](https://github.com/adobe/helix-rum-enhancer/issues/102) ([3df4132](https://github.com/adobe/helix-rum-enhancer/commit/3df413259cd0e71777328f738b81057f7f4e5520))

# [1.9.0](https://github.com/adobe/helix-rum-enhancer/compare/v1.8.1...v1.9.0) (2023-12-11)


### Features

* add support for source/target data attributes ([27739c6](https://github.com/adobe/helix-rum-enhancer/commit/27739c660b41f84df4e20d38efcf00d5335c7f5d))

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
