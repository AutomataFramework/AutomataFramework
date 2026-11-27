# unfake.js, copied in

From https://github.com/jenissimo/unfake.js at commit 663686899e8394dfda25efd7f2a947f008c6f676 (v1.4.0, 2026-09-29),
copied by hand, never installed from npm or git. Only the files the pixel-art path loads are here, unchanged:
`lib/{pixel,utils,core-client,core-codec,cvfree,edge-detect}.js`, `workers/unfake-core-worker.js` and the built core
`vendor/unfake-core/unfake_wasm.js` with `unfake_wasm_bg.wasm`. They load nothing else: no other library and nothing from
the web. unfake.js is MIT (`LICENSE`). Its built core includes the Rust crate `imagequant` 4.4.1, which is
GPL-3.0-or-later; its source is at the commit above and at https://github.com/ImageOptim/libimagequant. So
`@automataframework/art` as a whole is GPL-3.0-or-later (`../../LICENSE`), the Owner's choice on 2026-11-27.

sha256 of each file as copied:

```
b43ed71072c8ee6e573757f71afaa93835803e4cccf948b72bb6f61db29a2859  LICENSE
0fd91495d5d42acc988689e00b647509035d5e78b423d21437c616995e6cea66  lib/core-client.js
0cb36bf54203e7898a5f12b615b6ff709893c6cd438e263ea2b39628bee23b87  lib/core-codec.js
abdec424c23ce91e9fc786b87bf427e431107b1dab9c5a1103e3f7f3ce530348  lib/cvfree.js
ae297c726ed009ecb2a32f4bff65414c70d22d02367ba42862282105edfbc485  lib/edge-detect.js
61633e78675707f6d92a0d928f03dd8da0eff04e8766d1850587d89a995db437  lib/pixel.js
ca512495e47dc23ff3cb25939c2f556cfee8bbb9fce63e7c1c5248edc7e60024  lib/utils.js
b9839427747d8a5ccbe0e1e2db6e6bfb308425d641913b8b42dc59e4cea52f55  vendor/unfake-core/unfake_wasm.js
53f3e0e4c2f7897495183b8e1e75ae420671ed1b8ff6c3ffb4dd6ffedbf9f432  vendor/unfake-core/unfake_wasm_bg.wasm
3fa068cd372e6e9b0ec65d7e88b5ea3f9adc0ee034259836c4ff03e7902d4f26  workers/unfake-core-worker.js
```
