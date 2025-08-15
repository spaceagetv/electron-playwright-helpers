## [1.8.2](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.1...v1.8.2) (2025-08-15)


### Bug Fixes

* better menuItem representation ([69a59ff](https://github.com/spaceagetv/electron-playwright-helpers/commit/69a59ff6f4598991ea1ea93dae4b576ab2ab66a3))
* test on Node 18, 20, 22 ([23d0b2a](https://github.com/spaceagetv/electron-playwright-helpers/commit/23d0b2ae7df8490f5ed5073a0fdc1695a4fbaeaa))
* Ubuntu test compatibility ([76d07ca](https://github.com/spaceagetv/electron-playwright-helpers/commit/76d07ca40120629f905bb702b70316543134030c))

## [1.8.1](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0...v1.8.1) (2025-08-15)


### Reverts

* Revert "feat: better menuItem representation" ([d80343f](https://github.com/spaceagetv/electron-playwright-helpers/commit/d80343fc8cd2eb94c88e1c6f2b99422d0ff2fb68))

# [1.8.0](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.7.1...v1.8.0) (2025-08-15)


### Features

* better menuItem representation ([72d4f21](https://github.com/spaceagetv/electron-playwright-helpers/commit/72d4f21448e1d959e70c515c8850eeb4c2c487f7))

# [1.8.0-beta.20](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.19...v1.8.0-beta.20) (2024-11-22)


### Bug Fixes

* tweaks ([23edf67](https://github.com/spaceagetv/electron-playwright-helpers/commit/23edf678aa72496a572ef48b3e627f2b0a68b46a))

# [1.8.0-beta.19](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.18...v1.8.0-beta.19) (2024-11-18)


### Bug Fixes

* improve error handling for ipc helpers ([3102d34](https://github.com/spaceagetv/electron-playwright-helpers/commit/3102d3448ed479036d9b68d4db8e9cbf6d408f07))

# [1.8.0-beta.18](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.17...v1.8.0-beta.18) (2024-11-18)


### Bug Fixes

* don’t throw context error when retry is disabled ([1fc1789](https://github.com/spaceagetv/electron-playwright-helpers/commit/1fc1789a9024833c80c209243e3b08d8cd53c0c8))

# [1.8.0-beta.17](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.16...v1.8.0-beta.17) (2024-11-18)


### Bug Fixes

* disable option for retry ([3f7f9be](https://github.com/spaceagetv/electron-playwright-helpers/commit/3f7f9beca162265953d3dbb7507276f5056c3805))
* disable retry on menuItemClick ƒs ([14a410e](https://github.com/spaceagetv/electron-playwright-helpers/commit/14a410ea0cf2a33bc251de5f8e2d555ba9670930))

# [1.8.0-beta.16](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.15...v1.8.0-beta.16) (2024-11-17)


### Bug Fixes

* update retry options and improve tests for retryUntilTruthy ([2f024d1](https://github.com/spaceagetv/electron-playwright-helpers/commit/2f024d185c93b504163200b30be1be73ffe4f3bf))

# [1.8.0-beta.15](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.14...v1.8.0-beta.15) (2024-11-17)


### Features

* retryUntilTruthy() ([704e330](https://github.com/spaceagetv/electron-playwright-helpers/commit/704e330df839b2d01b14cd65000de966ca6994b9))

# [1.8.0-beta.14](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.13...v1.8.0-beta.14) (2024-11-16)


### Bug Fixes

* increase default retry count and expand error matching criteria ([c686f81](https://github.com/spaceagetv/electron-playwright-helpers/commit/c686f8110f1ddd6772e7567cf7d44c86a7035974))

# [1.8.0-beta.13](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.12...v1.8.0-beta.13) (2024-11-16)


### Features

* add retry options management functions and update error matching logic ([ed8a92c](https://github.com/spaceagetv/electron-playwright-helpers/commit/ed8a92c6f913f83cc7a20c3133c90a69ab14bfc7))

# [1.8.0-beta.12](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.11...v1.8.0-beta.12) (2024-11-16)


### Bug Fixes

* replace 'rm -rf' with 'rimraf' ([225016a](https://github.com/spaceagetv/electron-playwright-helpers/commit/225016a9ee4c7f3ee5ae5f4a8f6d194358d56bd3))
* tsc —project for older TS ([a81968c](https://github.com/spaceagetv/electron-playwright-helpers/commit/a81968cd0a60df70390020bdc7afa3be1a541c06))
* update Node.js versions in CI workflow to include 20 ([19fb0fa](https://github.com/spaceagetv/electron-playwright-helpers/commit/19fb0fadba9ad3bd4aff1d47d748815dbe768ed8))

# [1.8.0-beta.11](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.10...v1.8.0-beta.11) (2024-11-16)


### Bug Fixes

* update TypeScript target to ES2019 in tsconfig.json ([e3eb8d6](https://github.com/spaceagetv/electron-playwright-helpers/commit/e3eb8d6fc41c61d0ef8a0771bc84f211fd9686a6))

# [1.8.0-beta.10](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.9...v1.8.0-beta.10) (2024-11-16)


### Bug Fixes

* update build script to use specific tsconfig and add new tsconfig.build.json ([86be85b](https://github.com/spaceagetv/electron-playwright-helpers/commit/86be85bb6f95cfeb7f14ba594357b1d01efd3797))

# [1.8.0-beta.9](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.8...v1.8.0-beta.9) (2024-11-16)


### Bug Fixes

* Use retry everywhere ([6839258](https://github.com/spaceagetv/electron-playwright-helpers/commit/68392582a5c4c4f803a63312faf816a6e58b82fb))

# [1.8.0-beta.8](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.7...v1.8.0-beta.8) (2024-11-14)


### Bug Fixes

* include stack trace in retry() timeout error ([2f7fb3b](https://github.com/spaceagetv/electron-playwright-helpers/commit/2f7fb3b4fcf49aed71d9446e77e87c33cbb93c60))

# [1.8.0-beta.7](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.6...v1.8.0-beta.7) (2024-11-13)


### Bug Fixes

* more retries, better errors ([6965e08](https://github.com/spaceagetv/electron-playwright-helpers/commit/6965e08dbd4e359963a1c57fe28822cc14fbc5b3))

# [1.8.0-beta.6](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.5...v1.8.0-beta.6) (2024-11-13)


### Bug Fixes

* retry() reject with proper Error ([4243488](https://github.com/spaceagetv/electron-playwright-helpers/commit/4243488d783496ba432bf91f8ddfb611385157c3))

# [1.8.0-beta.5](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.4...v1.8.0-beta.5) (2024-11-13)


### Bug Fixes

* central retry() with timeout ([105c1c1](https://github.com/spaceagetv/electron-playwright-helpers/commit/105c1c1bfaf25f908200135eee131d569367e955))

# [1.8.0-beta.4](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.3...v1.8.0-beta.4) (2024-11-12)


### Bug Fixes

* typescript type ([8bfdcfa](https://github.com/spaceagetv/electron-playwright-helpers/commit/8bfdcfa3d33f12cf05f6d765390ff6ef89d9bf02))

# [1.8.0-beta.3](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.2...v1.8.0-beta.3) (2024-11-12)


### Features

* browserWindowWithRetry() ([2ae2083](https://github.com/spaceagetv/electron-playwright-helpers/commit/2ae20832821171008ec5df5b6536b46d0f7ef9b1))

# [1.8.0-beta.2](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.8.0-beta.1...v1.8.0-beta.2) (2024-11-12)


### Features

* evaluateWithRetry handle general errors ([f1e6c35](https://github.com/spaceagetv/electron-playwright-helpers/commit/f1e6c3562b6f083f387f3c5162f81baba2e30cea))

# [1.8.0-beta.1](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.7.1...v1.8.0-beta.1) (2024-11-04)


### Features

* evaluateWithRetry() ([938ab35](https://github.com/spaceagetv/electron-playwright-helpers/commit/938ab356f79b1d68de9db769bc36ef79e9bb2c89))

## [1.7.1](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.7.0...v1.7.1) (2024-02-18)

# [1.7.0](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.6.0...v1.7.0) (2023-11-04)


### Features

* new utilities for adding timeouts ([b15430e](https://github.com/spaceagetv/electron-playwright-helpers/commit/b15430e8e7faf651e45a01cfe007e65d0aca98ba))

# [1.6.0](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.5.5...v1.6.0) (2023-06-26)


### Features

* parse universal architecture ([4a8a5c0](https://github.com/spaceagetv/electron-playwright-helpers/commit/4a8a5c0ac1e9948c67aa26ee5dae581a8988141a))

## [1.5.5](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.5.4...v1.5.5) (2023-05-31)


### Bug Fixes

* ipcMainInvokeHandler() in E25 ([4fe5c7f](https://github.com/spaceagetv/electron-playwright-helpers/commit/4fe5c7f885f215d7fb3e688db1952341c0ed03f3))
* windows unhappy with getApp().close() ([9808931](https://github.com/spaceagetv/electron-playwright-helpers/commit/98089312bd21e7650278f26904cb53592380c390))

## [1.5.4](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.5.3...v1.5.4) (2023-03-21)


### Bug Fixes

* event object for ipcRendererCallFirstListener() ([8e2bd0c](https://github.com/spaceagetv/electron-playwright-helpers/commit/8e2bd0c81ca1667762cb05f8d137396922505519))

## [1.5.3](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.5.2...v1.5.3) (2023-02-16)


### Bug Fixes

* trigger releases for docs, refactor, style, and test ([40a5a1d](https://github.com/spaceagetv/electron-playwright-helpers/commit/40a5a1d3ee8d4dde3a878f17bd9e5f44efd8e146))

## [1.5.2](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.5.1...v1.5.2) (2023-02-16)


### Bug Fixes

* update README during release workflow ([d5f0994](https://github.com/spaceagetv/electron-playwright-helpers/commit/d5f099417abc104156b9f2b74caf1093aa59b111))

## [1.5.1](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.5.0...v1.5.1) (2023-01-25)


### Bug Fixes

* npm + github package ([fedbb09](https://github.com/spaceagetv/electron-playwright-helpers/commit/fedbb09a64d53c97c1ea80076383fda8879f03bf))

# [1.5.0](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.4.2...v1.5.0) (2023-01-25)


### Features

* **linux:** New Linux processing for parseElectronApp() ([d0827aa](https://github.com/spaceagetv/electron-playwright-helpers/commit/d0827aa71bcfd48bc819bba83b8c8a05035b8ae0))

## [1.4.2](https://github.com/spaceagetv/electron-playwright-helpers/compare/v1.4.1...v1.4.2) (2023-01-16)


### Bug Fixes

* semantic-release changelog ([80300e6](https://github.com/spaceagetv/electron-playwright-helpers/commit/80300e660dd9afff84984395970d87242a9fe25b))
