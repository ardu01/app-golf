# Fairway 5.0 — Phase 0 baseline

This document freezes **Fairway 4.2.6** as the restoration point for later 5.0 work. It does not change the product. Scoring, persistence, the service worker, maps, and Pages publishing are untouched. **5.0 is not released.**

Measured on 2026-10-03 from a clean checkout. Node `v22.14.0`.

## Freeze identity

| Item | Value |
| --- | --- |
| Repository | `ardu01/app-golf` |
| Default branch | `main` (`origin/HEAD` → `origin/main`) |
| Freeze commit | `6ceef035198804067f6d7a07dd1c146d41763bee` |
| Tree SHA | `2f5481f3bb5a6e921e6dcfb44edfec804200dda7` |
| Commit subject | Fairway 4.2.6 — misma tarjeta en la sala (#56) |
| Commit time | 2026-09-29 12:51:53 +0200 |
| Latest non-draft release | [Fairway 4.2.6](https://github.com/ardu01/app-golf/releases/tag/v4.2.6), tag `v4.2.6`, published 2026-09-29T10:51:56Z, not a draft, not a prerelease |
| Tag target | `v4.2.6` → `6ceef035198804067f6d7a07dd1c146d41763bee` (`targetCommitish` is `main`) |
| Live site | https://ardu01.github.io/app-golf/ |
| Working branch | `cursor/fairway-5.0-baseline-0946` |

The working branch was created with `git checkout -b` from that exact `HEAD`. History was not rewritten. The branch name uses the `cursor/…-0946` form required for this agent; it is the 5.0 baseline / restoration point (the name requested in the brief was `fairway-5.0/baseline`).

`main` is not modified by this branch. This pull request adds markdown under `docs/fairway-5.0/` only.

Release notes for `v4.2.6` match the code that was measured:

- Shell cache name `fairway-v4-426`
- JSON backup schema **3**
- Shared card at public HTTPS `https://mantledb.sh/v2/{code}/card`
- MQTT is best-effort and public
- Google Drive is the account backup, not the room

The commit message says local `node tests/run.mjs` was ok and that the GitHub Actions test was red because of billing. Both claims were re-checked below.

## Live site check

`curl -fsS https://ardu01.github.io/app-golf/index.html` and `sw.js` on 2026-10-03:

| Resource | SHA-256 | Bytes |
| --- | --- | --- |
| Live `index.html` | `b5e94c1d3dbfe24ffa4f485f0102784b914ae9becb5921b1a8b159d874e4eba3` | 574938 (`content-length`, and `etag` suffix `8c5da`) |
| Repo `index.html` | `b5e94c1d3dbfe24ffa4f485f0102784b914ae9becb5921b1a8b159d874e4eba3` | 574938 |
| Live `sw.js` | `62a726bbe65641d2aa33db45ca5ea3861b7ed37029c7fbdc5acc8d6877e1c460` | same file as the repo |
| Repo `sw.js` | `62a726bbe65641d2aa33db45ca5ea3861b7ed37029c7fbdc5acc8d6877e1c460` | 3570 |

Live `index.html` `last-modified`: Tue, 29 Sep 2026 10:52:19 GMT. Response headers include `cache-control: max-age=600` and `access-control-allow-origin: *`. No `Content-Security-Policy` response header was present. `sw.js` still contains `const SHELL = "fairway-v4-426"` and `const MAPS = "fairway-maps-v1"`.

## Tests

Command, as documented in `docs/testing.md` and `README.md`:

```bash
node tests/run.mjs
```

Exit code **0**. Thirteen suites, zero suite failures. The runner prints one line per suite and does not print a numeric pass count. `assert.` call sites in those thirteen files: **791** (count of the token, not a runner total).

`tests/persist.mjs` prints a `QuotaExceededError` on purpose. `docs/testing.md` says the fake store throws quota and the suite still ends at `persist ok`. That happened. The stack below is the verbatim run, including that expected error.

```
scoring ok
backup ok
maps ok { courses: 54, perHole: 22, overview: 4, images: 404 }
referee ok
drive ok
storageSetItem fairway.activeRound.v1 Error [QuotaExceededError]: quota
    at Object.setItem (file:///workspace/tests/persist.mjs:90:21)
    at storageSetItem (eval at load (file:///workspace/tests/persist.mjs:57:14), <anonymous>:65:18)
    at Object.persistActiveRound (eval at load (file:///workspace/tests/persist.mjs:57:14), <anonymous>:150:10)
    at file:///workspace/tests/persist.mjs:256:28
    at ModuleJob.run (node:internal/modules/esm/module_job:271:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:578:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:116:5)
persist ok
migration ok
pwa ok
stats ok
security ok
nav ok
carousel ok
shared ok
all tests ok
```

Suite order in `tests/run.mjs`: scoring, backup, maps, referee, drive, persist, migration, pwa, stats, security, nav, carousel, shared.

`node tests/e2e.mjs` is documented separately and is **not** part of `node tests/run.mjs`. It was not run in this phase (it needs Playwright and Chrome). No test was edited.

## Sizes (measured)

There is no standalone CSS file (`find` returned 0 `*.css` files). UI, CSS, in-memory state, and golf domain logic still live in `index.html`. The files under `fairway/js/` are persistence and the shared round only.

| File or group | Bytes |
| --- | --- |
| `index.html` | 574938 |
| `index.html` lines | 11253 |
| `<style>` inner CSS (1 block) | 110989 |
| Inline `<script>` inner JS (2 blocks, excluding `<script src>`) | 443091 |
| `let COURSES = …` statement (one line) | 100880 |
| Markup from `<body` to the first inline script | 19817 |
| Through `</head>` | 111847 |
| `function` declarations in `index.html` | 398 |
| `sw.js` | 3570 |
| `manifest.webmanifest` | 691 |
| `fairway/js/*.js` together | 77539 |
| `holes/` files | 426 files, 17868056 bytes |

`fairway/js` file sizes:

| File | Bytes |
| --- | --- |
| `keys.js` | 1749 |
| `idb.js` | 1238 |
| `persist-boot.js` | 1540 |
| `persistence.js` | 9973 |
| `shared-round.js` | 23505 |
| `shared-mail.js` | 13780 |
| `shared-rtc.js` | 4332 |
| `shared-boot.js` | 21422 |

## Version, cache, schema

| Marker | Where | Value |
| --- | --- | --- |
| Product version | `fairway/js/keys.js` `APP_VERSION`; backup `appVersion`; header in `index.html` | `4.2.6` |
| JSON backup schema | `BACKUP_SCHEMA` in `keys.js`; `collectFairwayBackup` writes `version: 3` | **3** |
| IndexedDB | `idb.js` | name `fairway`, version **1**, store `kv` |
| Shell cache | `sw.js` `SHELL` | `fairway-v4-426` |
| Map cache | `sw.js` `MAPS` | `fairway-maps-v1` (cap `MAPS_MAX` = 120) |
| Shared-room document schema | `ROOM_SCHEMA` in `shared-round.js` | **1** (not the backup schema) |
| Web app manifest | `manifest.webmanifest` | **no `version` member**. `description` is `Marcador de golf personal · 4.2.6`. `start_url` `./`, `scope` `./`, `display` `standalone` |

`index.html` loads, after the inline script:

1. a classic script that registers `./sw.js`
2. `<script type="module" src="fairway/js/persist-boot.js">`
3. `<script type="module" src="fairway/js/shared-boot.js">`

## Directory map

Top level:

| Path | Role |
| --- | --- |
| `index.html` | App shell: CSS, course catalog, scoring, screens, Drive, history/back-gesture, service-worker registration |
| `sw.js` | Shell cache `fairway-v4-426` and map cache `fairway-maps-v1` |
| `manifest.webmanifest` | PWA manifest |
| `.nojekyll` | Empty file so Pages does not run Jekyll |
| `fairway/js/` | Persistence and shared-round modules (no bundler) |
| `holes/` | 26 course folders. Do not delete. 22 `manifest.json` files, 404 `.webp` files |
| `icons/` | PWA icons, including Escorial artwork referenced by the shell cache |
| `tests/` | `node tests/run.mjs` plus `e2e.mjs` and `extract.mjs` |
| `docs/` | Existing 4.x notes plus this `fairway-5.0/` folder |
| `assets/` | Static assets outside the hole maps |
| `ops/fairway-multicourse-patch/` | Old patch copies of `sw.js` and `club-funcs.js`. Not the live app |
| `patches/` | Patch notes / leftovers. Not the live app |
| `.github/workflows/test-fairway.yml` | The only workflow stored in the repo |

`fairway/js` modules:

| Module | Role |
| --- | --- |
| `keys.js` | Storage key names, `APP_VERSION`, `BACKUP_SCHEMA = 3`. Shared queue key is `fairway.sharedRound.v1` and is **not** part of backup schema 3 |
| `idb.js` | `indexedDB.open("fairway", 1)` |
| `persistence.js` | Copy `localStorage` → IndexedDB, verify, recover missing keys, mirror later writes. Never deletes `localStorage` as part of migration |
| `persist-boot.js` | Browser boot: drop retired `fairway.bag.v1`, migrate, recover, attach the mirror |
| `shared-round.js` | Queue, field merge, room document. No network and no DOM |
| `shared-mail.js` | HTTPS room on MantleDB. Optional MQTT mirror. Optional alternate HTTP base (empty string today) |
| `shared-rtc.js` | Optional data channel. Signaling sits inside the room JSON |
| `shared-boot.js` | Spanish shared-round panel and the browser sync loop |

What is still inside `index.html` (not extracted): course list, WHS / Stableford / stroke allocation, social modes, all screen rendering, roster and round history, active-round `localStorage` writes, Google Drive, the history-sentinel / edge-guard navigation, and service-worker update policy.

## File hashes of the freeze

Tree: `2f5481f3bb5a6e921e6dcfb44edfec804200dda7`.

| SHA-256 | Bytes | Path |
| --- | --- | --- |
| `b5e94c1d3dbfe24ffa4f485f0102784b914ae9becb5921b1a8b159d874e4eba3` | 574938 | `index.html` |
| `62a726bbe65641d2aa33db45ca5ea3861b7ed37029c7fbdc5acc8d6877e1c460` | 3570 | `sw.js` |
| `4756c0616102c993c737cfe2484f08ea2962186eae43c37cdc088e741e64d7e6` | 691 | `manifest.webmanifest` |
| `cf66ae4a1bef3ec5fc692cf53316782bdba97a983e7c9dd81f6d208467779058` | 1749 | `fairway/js/keys.js` |
| `36b1dc39f041333ec57d5109db787f9d8dcdc62040d4b302eedd19543444be6a` | 1238 | `fairway/js/idb.js` |
| `575d602fd657d1f617d6213570994a8cba57d67ddec99322709237aabd87be34` | 9973 | `fairway/js/persistence.js` |
| `84b9d292867a33e8c5dc3b23f975a8632f7cde9f10cbf386b3bb3e8d9a94bbca` | 1540 | `fairway/js/persist-boot.js` |
| `2a40961c616e27c6d9e484703a4f263abef9b217ecc2b5ef133e8134c087752c` | 23505 | `fairway/js/shared-round.js` |
| `cb8dbcb55fb231cd23c7d30cb8605a29f41a16359c40b592e11df6275fe6581f` | 13780 | `fairway/js/shared-mail.js` |
| `462503527cb9aa58eb50184644e64bc9d529b0bcbe53ea5f25f051b6200b07b2` | 4332 | `fairway/js/shared-rtc.js` |
| `7117890ccc9dca7d1108240d9cece908d972e9a2bfc5f448231fd1f330f62a37` | 21422 | `fairway/js/shared-boot.js` |
| `a686d1b728984d06511c2938b588afef75e81639353290259b45f75d34376c4c` | 640 | `.github/workflows/test-fairway.yml` |

## GitHub Actions

Repo workflows on the freeze commit:

| Workflow | In the git tree? | State |
| --- | --- | --- |
| `test-fairway` (`.github/workflows/test-fairway.yml`) | Yes | Active. `on: push` to `main` and `pull_request`. `permissions: contents: read`. One job: `actions/checkout@v4` then `node tests/run.mjs`. No `git push`. No Pages deploy |
| `pages-build-deployment` (`dynamic/pages/pages-build-deployment`) | No. GitHub Pages generated it | Active |

`git grep 'git push'` under `.github` finds nothing. The five older workflows that downloaded another app or pushed generated code (`publish-fairway-v3`, multicourse, tees, assemble, decode) are not in this tree. This baseline does not add them back and does not add `actions/deploy-pages`.

Pages, from the GitHub Pages API on 2026-10-03:

- `build_type`: `legacy`
- source branch `main`, path `/`
- `html_url`: https://ardu01.github.io/app-golf/
- `status`: `built`
- `https_enforced`: true
- `cname`: null

Pages does not wait for `test-fairway`. On the freeze SHA both runs exist:

| Run | Workflow | SHA | Result |
| --- | --- | --- | --- |
| [36558192759](https://github.com/ardu01/app-golf/actions/runs/36558192759) | `test-fairway` | `6ceef035198804067f6d7a07dd1c146d41763bee` | **failure** |
| [36558192022](https://github.com/ardu01/app-golf/actions/runs/36558192022) | `pages-build-deployment` | same SHA | **success** |

The test failure is billing, not a product failure:

- Job `test` id `109372359272` has `steps: []`, `runner_id: 0`, `runner_name: ""`.
- Started 2026-09-29T10:51:57Z, completed 2026-09-29T10:51:59Z (about two seconds, no checkout, no `node`).
- Check-run annotation, level `failure`: **`The job was not started because your account is locked due to a billing issue.`**
- `gh run view 36558192759 --log-failed` returns `log not found` for that job id, which matches a job that never started.
- The same red pattern (empty start, billing lock) is on the earlier 4.2.x pushes. Local `node tests/run.mjs` on this SHA exits 0.

A second annotation on that check is a notice that `ubuntu-latest` will move to Ubuntu 26 on 2026-10-19. That notice is not why the job failed.

## What this baseline is for

Later 5.0 work can reset to `6ceef035198804067f6d7a07dd1c146d41763bee` (tree `2f5481f3bb5a6e921e6dcfb44edfec804200dda7`) or to this branch before any rewrite. The audit of that tree is `docs/fairway-5.0/AUDIT.md`.
