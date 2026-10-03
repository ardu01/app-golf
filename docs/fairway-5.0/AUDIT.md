# Fairway 5.0 — Phase 1 audit

Audit of freeze `6ceef035198804067f6d7a07dd1c146d41763bee` (Fairway **4.2.6**, backup schema **3**). Evidence is from the code, the test run in `BASELINE.md`, and the live site hash match. Nothing here is implemented.

**5.0 is not released. `main` is not modified. Scoring, persistence, the service worker, maps, and Pages config are unchanged.**

Severity used below:

| Level | Meaning |
| --- | --- |
| P0 | Data loss or corruption, serious security, wrong scoring, or the app unusable |
| P1 | Reliability, architecture, or important UX |
| P2 | Relevant improvement |
| P3 | Polish |

No scoring formula in this tree failed its locked test. There is no P0 under “wrong scoring”. The formulas are listed so a later rewrite does not change them silently.

## P0

### P0-1 — A shared-room stamp can lock a hole against every honest phone

The shared card is one public JSON document:

`POST` / `GET` `https://mantledb.sh/v2/{code}/card`

(`FAIRWAY_ROOM_STORE` in `fairway/js/shared-mail.js`). There is no account and no write key. The code is a bearer token. MQTT `wss://test.mosquitto.org:8081/mqtt`, topic `fairway/v1/room/{code}`, retained, is a second public copy of the same JSON when the socket opens.

Field merge keeps the value with the greater `at` (`mergeFields` and `applyFieldsToPlayers` in `fairway/js/shared-round.js`). `finiteAt` accepts any finite number from 0 up to `1e15` (about year 33658) and rejects only non-finite, negative, or larger values. `Date.now()` in 2026 is about `1.7e12`.

Anyone who knows the code can `POST` a document whose field stamps sit near `1e15`. Honest clients treat those stamps as strictly newer and then refuse to replace them (`hasLocal && field.at <= localAt` returns without writing). The phones in the room cannot repair the hole. That is shared-card corruption, not only a privacy note.

The same path accepts a clock set a few minutes ahead. That case is the P1 clock problem below. The P0 is the ceiling: the protocol treats a hostile or absurd timestamp as permanent truth.

Sanitizing the *value* does not stop this. Scores are still limited to 1–15, putts 0–6, FIR/GIR to the known tokens, ball text stripped of `<>`. A legal-looking 4 with a future stamp still wins forever.

### P0-2 — An already-acked stroke can disappear from the room when the writer stops syncing

MantleDB `POST` replaces the whole document. There is no compare-and-swap and no revision the server checks.

`syncShared` (`fairway/js/shared-round.js`):

1. `GET` the room.
2. Build a union of local stamped fields, the pending queue, and the remote fields. For one key, the higher `at` wins. A missing remote key does not delete a local score.
3. `PUT` the whole union.
4. `GET` again. Pending deltas that show up in that echo are removed from the queue.
5. If a still-pending delta is missing or older in the echo, it tries **one** more pass (`for (let pass = 0; pass < 2; pass++)`).

That second pass protects the writer’s **still-pending** queue against its own read-back. It does not protect a stroke that was already acked. After ack, the stroke lives only as a local field plus whatever the last `PUT` left in the document.

Two phones can `GET` the same document, each add a different hole, and `PUT`. The later `PUT` replaces the document. If the later writer’s `GET` did not contain the earlier hole, that hole is absent from the new document. The earlier phone puts it back on a later flush **only while it is still in the room and still has the local score**.

`fairwaySharedRoundClosed` in `fairway/js/shared-boot.js` sets `seal`, runs **one** `syncShared`, and if `pending` is empty and `status === "synced"` it calls `detach()`. `detach()` clears the code and the queue. The closer will not flush again. A stale `PUT` from another phone, in flight or just after that read-back, removes the closer’s holes from the room. The closer’s on-device history can still hold them. The other phones show a card that dropped strokes.

`fairwaySharedLeave` is stricter: it confirms, then `detach()` with **no** final flush. Pending strokes stay on the phone and never have to reach the room.

`tests/shared.mjs` covers sequential sync: host writes, guest writes later, host syncs again, both fields remain. It does not overlap two `PUT`s, and it does not seal the writer between them. The sequential tests pass. The race is in the protocol, not in a red test.

Local `fairway.activeRound.v1` is written before the network attempt. This P0 is loss on the **shared** card, which is the 4.2.6 promise (“misma tarjeta”).

## P1

### P1-1 — Wall-clock last-write-wins is not a total order

Stamps are `Date.now()` (and one batch timestamp from `stampExisting`). Equal `at` keeps the **local** side (`mergeFields` lets the first map win ties; `applyFieldsToPlayers` ignores a remote stamp that is not strictly greater). Two phones with the same millisecond and different values each keep their own and each `PUT` it. They do not converge. A phone whose clock is ahead wins every collision until the other clock catches up, including after reconnect.

Offline queues are real: `syncShared` returns immediately when `online === false` and leaves `pending` in place. Reconnect calls `flush` from the `online` event, and a timer calls `flush` every 8 seconds. Duplicate edits of one field collapse in `queueDeltas` (same key, greater or equal `at` replaces). That part is sound. The order key is not.

### P1-2 — Drive fallback can say the room is up to date when the other phone cannot see it

`fallbackMailbox` in `shared-boot.js`: if the HTTPS `get` or `put` throws once during a flush, the rest of that flush uses `fairwayDriveRoomGet` / `fairwayDriveRoomPut`. Those write `Fairway/fairway-room-{code}.json` with scope `drive.file` on **this** Google account. `docs/drive-sync.md` already says that file is not the shared card.

The panel does not say that. With a transport of `drive` it renders “Vía Drive. Otro móvil con el código recibe los mismos golpes.” `sharedStatus` then returns “Al día” when the queue is empty. The friend on another Google account does not receive that file. A 429, a blip, or MantleDB being down is enough to take this path for the rest of that flush. The next flush builds a new wrapper, so the fallback is not permanent, but a close that observed `synced` can detach (P0-2) after a private write.

The personal backup file remains `Fairway/fairway-data.json`. The room file is a different name. Neither is the multi-phone card.

### P1-3 — Five stores can disagree

The marker reads memory (`state`, `PLAYERS`) and `localStorage`. The other stores are copies with different rules.

| Store | What it holds | How it can diverge |
| --- | --- | --- |
| `localStorage` `fairway.activeRound.v1` | Live round, written by `persistActiveRound` before any shared send | Source the UI restores |
| `fairway.activeRound.bak.v1` | Previous good primary, written before a new primary | Used when the primary is missing or corrupt. A good primary is not replaced by the `.bak` |
| `fairway.rounds.v1` and `fairway.rounds.bak.v1` | History, cap `ROUNDS_MAX` = 99999 | Quota will fail before that cap on a phone. The cap is what `tests/backup.mjs` locks |
| IndexedDB `fairway` / `kv` | Mirror of `MIRRORED_KEYS`, including the shared queue | `attachLocalMirror` fires `idb.set` and ignores failure. Migration never deletes `localStorage`. `recoverMissingLocal` fills **empty** keys only and will not replace a usable or corrupt active round |
| JSON backup schema 3 | Rounds, roster, host, active round, setup. Written by `collectFairwayBackup` | Does **not** include `fairway.sharedRound.v1`. Import / Drive merge does not restore room membership or stamps |
| Drive `fairway-data.json` | That schema-3 JSON for this account | `mergeFairwayBackup` will not replace a protected local round (`driveActiveRoundDirty`, a play screen, or `localActiveRoundIsProtected`). It can still replace an unprotected active round and it does write `fairway.host.v1` |
| Public room document | Scores, roster meta, presence, WebRTC signals | Not in the schema-3 file. Can move ahead of, or behind, the phone (P0) |
| Drive `fairway-room-{code}.json` | Private copy of a room document | Visible to this account only (P1-2) |

`SHARED_KEY` is mirrored to IndexedDB and is in `JSON_KEYS`, but `collectFairwayBackup` does not read it. A schema-3 restore can bring back an active round whose strokes do not match `fairway.sharedRound.v1` stamps still sitting in `localStorage` or IndexedDB.

Two tabs are not coordinated. There is no lock around `localStorage`. Whichever tab wrote last wins the active round.

OAuth: `FAIRWAY_DRIVE_CLIENT_ID` in `index.html` is the public web client id for `https://ardu01.github.io` (comment in file: not a secret). Scope is `https://www.googleapis.com/auth/drive.file`. `_driveToken` stays in memory. `stripSecrets` drops `access_token`, `refresh_token`, `id_token`, and `token` from `drive.meta` before the IndexedDB copy. `tests/security.mjs` and `tests/drive.mjs` assert the file has no `client_secret`. This audit found no client secret, private key, or service-account JSON in the repo.

### P1-4 — The app is still one 575 KB document

`index.html` is 574938 bytes: about 111 KB of CSS, about 443 KB of inline script, about 101 KB of `COURSES` on one line, 398 `function` declarations. There is no `.css` file and no bundler. GitHub Pages serves the files as they are.

Already extracted, and already precached by the service worker:

- persistence: `keys.js`, `idb.js`, `persistence.js`, `persist-boot.js`
- shared round: `shared-round.js`, `shared-mail.js`, `shared-rtc.js`, `shared-boot.js`

Still inside `index.html`: catalog, handicap and all score math, every screen, Drive, active-round persistence, and the iOS history/edge-guard. A later split can be plain ES modules. It does not need React, Vue, or Angular. A proposal is at the bottom. Moving `courseHandicapFor` without keeping the bytes equivalent will change a number the tests currently pull out of `index.html` with `tests/extract.mjs`.

### P1-5 — Service worker: hold during a round is correct, and easy to break later

`sw.js`:

- `install` opens `fairway-v4-426` and `cache.addAll` of the shell list. The install handler does **not** call `skipWaiting`. `tests/pwa.mjs` locks that.
- `activate` migrates `/holes/` responses into `fairway-maps-v1`, deletes every other cache name, and `clients.claim()`.
- A `message` of `SKIP_WAITING` is the only `skipWaiting()`.
- `fetch` for shell URLs is cache-first: it returns the cached response when one exists, and updates the cache from the network in the background. Map URLs use the same pattern, then trim to 120 entries. Google hosts are not intercepted.

`index.html` registers `./sw.js` and posts `SKIP_WAITING` only from `activateWaiting`, which returns immediately when `fairwayShouldHoldUpdate()` is true. The hold is true on the close screen, when a round is armed or live, when `isRoundInProgress()`, when the active `.bak` needs recovery, and on hole / scorecard / leader / ajustes / árbitro while an active round is stored. After a round is saved (`_roundSaved`) the hold is false so the update can apply.

`controllerchange` reloads only when this is not the first controller, the hold is false, and `sessionStorage` `fairway.swReload` is older than 10 seconds. `go("home")` calls `fairwayFlushAppUpdate` when the hold is false.

So a published shell does not reload over an open round. That behavior is intentional. A 5.0 rewrite should keep it. The related gap is smaller: the flush runs from Home, not from every non-hold screen, and cache-first means the open document stays on the cached shell until that reload. Killing the process and opening the PWA again restores from `localStorage` / `.bak` (the boot calls `restoreActiveRound`). That is a new load, not a mid-round reload.

Do not “fix” the hold by calling `skipWaiting` in `install`, or by reloading on `controllerchange` during a round.

### P1-6 — Room codes, host leave, and 2–4 clients

Alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 symbols, no `0`, `1`, `I`, `O`). A 6-character code has `32^6` = 1,073,741,824 values. `makeCode` uses `Math.random`. `createRoom` does not `GET` the namespace before showing the code.

If `role === "host"`, `joinedForeign` is false, and the remote `createdBy` is some other device, `syncShared` returns `conflict` and does not merge. `flush` then mints a new code, toasts it, and retries, at most four attempts. A joiner does not do that check: any existing document for that code is the room they join. An empty local card adopts the host’s course, tee, and players (`adoptRoom`). A card that already has strokes keeps them and appends unknown player ids (`ensureRemotePlayers`, cap 8 players).

`fairwaySharedLeave` drops the room locally and does not delete the server document. Other phones keep syncing. The host’s unsent queue is abandoned (see P0-2). There is no host transfer.

Presence keeps at most 8 device ids. WebRTC `pickPeer` talks to one peer seen in the last 20 seconds. Three or four phones do not form a mesh. The HTTPS document is the actual shared card; the data channel is a shortcut and its signals ride in the same public JSON (last 16). If the channel fails, the HTTPS path continues. That split is fine. The hole is still P0-1 / P0-2 on the document those phones share.

Joining offline is refused with a toast. Scoring offline on a code already stored stays local and is marked pending. `cache: "no-store"` is set on the MantleDB `fetch`. The service worker does not cache that origin (the fetch handler ignores non-shell, non-map URLs).

### P1-7 — Security and privacy short of the room lock

There is no end-to-end encryption. The release text says the strokes are not encrypted. Treat that as a product fact to preserve or replace on purpose, not as an accident in one function.

XSS surface: rendering is `innerHTML` in many screens. `escapeHtml` exists and the hole card, roster, leader, and referee log use it for names and free text. Shared-room ball text and backup strings pass through clippers that strip `<>` and control characters (`clipText` / `clipStr`). This pass did not find a remote field that lands in `innerHTML` without one of those. It also did not find a Content-Security-Policy in `index.html` or on the live response. The Google Identity Services script is injected from `https://accounts.google.com/gsi/client` with no integrity attribute. A later edit that interpolates one unsanitized string becomes script execution. That is P1 defense-in-depth, not a demonstrated P0 bug in this tree.

`document.write` is used for a generated scorecard image in a new window. Map `src` values from manifests are rejected when they look like `http:`, `data:`, or `blob:` (`normalizeCoursePhotoFile`). `tel:` links for La Herrería are course data in the repo, not room input.

Hostile schema-3 JSON is filtered by `validateFairwayBackup` before `mergeFairwayBackup` writes storage. Shared room JSON is filtered by `sanitizeRoom` / `sanitizeDelta`. Neither filter stops P0-1, because a legal score with a huge `at` is valid.

### P1-8 — iPhone back-gesture: keep it, do not “simplify” it

This is a preservation constraint, not a defect to remove.

Inicio must not leave the installed PWA on an edge swipe. The code’s own comment (above `fairwayNavBoot` in `index.html`) records why a single hash is not enough: WebKit’s interactive swipe does not stop on same-document hashes the way the Back button does, `pushState` during `popstate` is ignored, and `overscroll-behavior-x` does not cancel the gesture in WebKit (bug 240183 noted in the comment). `touch-action` has no value that disables it.

What the freeze actually does:

- A fixed 30px strip, `#fairwayEdgeGuard` / `.fairway-edge-guard`, shown only when the screen is Inicio and the hole sheet is closed. CSS width 30 matches `fairwayNavEdgeBandPx()`.
- `touchstart` on that band is non-passive, calls `preventDefault` and `stopImmediatePropagation`, and is registered **before** the listener that would `pushState`. A touch in the band must not create the history entry the swipe would animate.
- Home sentinel depth is 3 (`fairwayNavHomeSentinelDepth`). Hashes look like `#b=…`.
- If a swipe still pops, the home `popstate` is a trap: no screen change, scroll restored, `history.go(1)`, then the cushion is refilled on a later turn.
- Nested screens stay one step. A live round also traps the last step. Scores are not cleared by the trap.

`tests/nav.mjs` locks the decision helper. It does not run on an iPhone. A 5.0 module split may **move** these functions. It must not drop the guard, the sentinel depth, the trap, or the “do not pushState from the edge touchstart” order. That behavior is what keeps a round from accidentally exiting the PWA.

## P2

- **Module split without a framework.** See the proposal. The practical risk is `tests/extract.mjs` reading functions out of `index.html` by source text.
- **Test gaps.** No overlapping `PUT`, no future `at`, no three- or four-client run, no real MantleDB or MQTT, no assertion that seal/leave waits for a later `GET`. `e2e.mjs` is outside `node tests/run.mjs`. Navigation tests do not drive the iOS gesture.
- **Shared protocol cannot clear a hole.** `diffPlayers` skips a new value of `undefined`, so a removed stroke is not an operation. The hole UI also has no clear: `adjScore` clamps to 1–15. A wrong stroke can be replaced by another number with a newer stamp. It cannot be removed.
- **Score ranges differ by store.** The live stepper and the room allow scores 1–15 and putts 0–6. Schema-3 import allows scores 0–30 and putts 0–15 (`sanitizeScoreMap`). An imported 16 does not fit a later room delta (`sanitizeValue` returns `undefined` and the delta is dropped).
- **`ROUNDS_MAX` is 99999.** The backup test locks that number. A phone will hit quota first. The quota path toasts and keeps the previous `.bak` when the primary was good.
- **WebRTC is one peer.** Fine as a hint. Do not describe it as the sync path for four phones.
- **Room document size.** MantleDB entries are documented as 64 KB. On HTTP 413 the client retries once with `signals: []`. The score map for eight players is small; the signals (up to 16, each up to 4000 characters) are the bulk.
- **`ops/` and `patches/`** are not the running app. Leave them out of any “generated code” workflow. Do not resurrect a workflow that `git push`es output.
- **Manifest** has no `version` field. The shell cache name is the real cache buster.
- **Pages HTML `cache-control: max-age=600`** on the CDN, plus the service-worker shell cache. Both are reasons a phone stays on an old shell until the held update runs.

## P3

- Home already has 16px between the round card and the shared-round card (`#screen-home .home-hero > #sharedRoundHome`). `tests/shared.mjs` locks the rule. Not a 5.0 feature.
- Mixed Spanish UI and English comments. Keep the UI strings unless a copy change is explicit.
- Shell comment in `sw.js` documents the collapsed version numbering (`4.2.6` → `426`). A later bump has to change `SHELL`, `APP_VERSION`, the backup `appVersion`, and the header together. This audit does not bump them.
- Social mode names (Chaos, Rey del Hoyo, and the rest) are local games. They are not WHS. They still must not change silently if a rewrite moves `applyModeScores`.

## Golf formulas that must not change silently

All of these live in `index.html`. `tests/scoring.mjs` loads them from that file. `tests/stats.mjs` locks the 9-vs-18 gross split.

**Course handicap** (`courseHandicapFor`):

```text
CH18 = round( HI × (slope / 113) + (CR − Par) )
```

`Math.round` of the whole expression. Locked vector: HI 10, slope 125, CR 71.5, par 72 → `round(10 × 125/113 + (71.5 − 72))` = `round(10.5619…)` = **11**. HI 0 → 0. A negative index on a neutral tee (slope 113, CR 72, par 72) stays negative (the test uses −2 → −2).

If the tee has no slope or CR, the code rounds the index and does not invent a rating.

**Nine holes of an 18-hole course** (`scaleHandicapForRound`): `round(CH18 / 2)` when the round length is ≤ 9 and the course has more than 9 holes. The locked example is `round(11 / 2)` = 6, including HI 10 on the tee above played as 9 holes. This path does **not** switch to a 9-hole CR/slope.

**Playing handicap:** `refreshPlayerHandicaps` sets `p.ph = p.ch`. Allowance is 100%. There is no 95% stroke-play allowance and no competition allowance table.

**Strokes on a hole** (`strokesOnHole`): playing handicap is floored when positive and ceiled when negative (`Math.floor` / `Math.ceil`). Positive CH receives strokes on stroke index 1…CH, with an extra stroke every 18 (or every `n` holes). CH 10 receives on SI 1–10. CH 20 receives 2 on SI 1–2 and 1 on SI 3. CH 0 receives nothing. Plus CH −2 **gives** a stroke on the two easiest holes (SI 18 and 17 in the test list).

**Nine-hole stroke index** (`relativeStrokeIndex`): when fewer than 18 holes are in play, the index is the rank among those holes, not the 18-hole SI printed on the card. The test deck maps card SI 1, 3, and 15 to relative 1, 2, and 9.

**Stableford** (`stablefordHole`): `netDiff = score − par − strokesReceived`.

| netDiff | Points |
| --- | --- |
| ≤ −3 | 5 |
| −2 | 4 |
| −1 | 3 |
| 0 | 2 |
| 1 | 1 |
| ≥ 2 | 0 |

Unscored holes do not add gross. Gross for 9-hole rounds and gross for 18-hole rounds are averaged separately (`statsGrossByLayout`). They are not one mean.

`playerCourseHcp` must keep a stored CH of 0 and a plus handicap. The test exists because `||` treated 0 as missing.

## Maps under `holes/`

Do not delete a folder, a manifest, or an image. `tests/maps.mjs` result on this tree: **54 courses, 22 per-hole folders, 4 overview-only folders, 404 images**, and no orphan directory under `holes/`.

`HOLE_MAP_COURSES` in `index.html` points at those 26 directories. Overview-only entries are the two Forus Las Rejas layouts and the two Centro de Tecnificación layouts (`overview.webp` and friends).

Per-hole photo order in `updateHoleFoto`:

1. `manifest.json` `file`, if the fetch has completed (`cache: "no-store"` on the manifest request).
2. Manifest `fallback`, if present.
3. `NN.webp`, then `NN.jpg`, then `NN.png`.
4. Otherwise the caption path shows “Sin mapa de este hoyo”.

`el-robledal`, `rshecc-norte`, and `rshecc-sur` manifests list `01.webp`–`18.webp` and must not grow invented hole names. The map test locks `!("name" in h)` for those three.

Courses with no folder use `COURSE_GEO` and an IGN PNOA WMS URL when a center exists (`approx: true` on many of those centers, including Puerta de Hierro). The comment in the source says those are satellite views, not invented hole drawings. Do not delete them and do not “correct” `approx: true` coordinates in a cleanup.

The service worker stores `/holes/` responses in `fairway-maps-v1`, migrates them out of older cache names on activate, and does not drop that cache when the shell name changes. Cap 120. The shell precache list does not include the images, so the first view of a hole still depends on the network, then the cache.

## Tests and gaps

`node tests/run.mjs` is the gate. On this freeze it exits 0 (verbatim log in `BASELINE.md`). What each file is willing to lock is summarized in `docs/testing.md` and matches the sources:

| Suite | Locks |
| --- | --- |
| `scoring.mjs` | The CH 11 vector, 9-hole halving, stroke allocation, Stableford table |
| `backup.mjs` | Schema 3, hostile HTML stripped, history cap 99999 |
| `maps.mjs` | 54 / 26 / 404 and real manifest `file` paths |
| `referee.mjs` | Referee phrases already covered |
| `drive.mjs` | Sync plan, merge, labels, public client id, no secret |
| `persist.mjs` | Active round, `.bak`, quota toast, do not clobber a protected round |
| `migration.mjs` | IndexedDB round-trip, corrupt JSON, quota, interrupt, do not delete `localStorage` |
| `pwa.mjs` | No `skipWaiting` on install. No reload on close, play screens, or an armed round |
| `stats.mjs` | 9-hole and 18-hole gross stay apart |
| `security.mjs` | `clipStr`, `escapeHtml`, hostile backup, only `test-fairway.yml` with `contents: read` and no `git push` in workflows |
| `nav.mjs` | Back decision stays inside the app; Home does not exit |
| `carousel.mjs` | Swiping the hole card selects that player |
| `shared.mjs` | Newer stamp wins, an empty remote hole does not wipe a local stroke, offline keeps the queue, two player ids share one document, HTTPS room against a fake `fetch` |

Gaps that matter for 5.0, given the P0s: concurrent `PUT`, future timestamps, seal/leave, Drive fallback reported as synced, 3–4 clients, and a device test of the edge guard. Filling those gaps is future work. This phase does not add tests and does not change the suite.

## Proposal — architecture (not implemented)

Stay on vanilla ES modules served by GitHub Pages. No React, Vue, or Angular. No bundler unless a later phase measures one and keeps the service worker’s file list explicit. No generated commit pushed by Actions.

Suggested cut of today’s `index.html`, each piece moved so the current tests still observe the same functions (either the tests start importing modules, or a thin `index.html` re-exports the same names `extract.mjs` already finds):

| Future module | Taken from | Notes |
| --- | --- | --- |
| `fairway/css/fairway.css` | The single `<style>` block, 110989 bytes | Linked from `index.html`. Add it to the shell precache in the same change as the HTML, or the cache-first worker will open an unstyled page. Not in this PR |
| `fairway/js/domain/scoring.js` | `courseHandicapFor`, `scaleHandicapForRound`, `strokesOnHole`, `relativeStrokeIndex`, `stablefordHole`, `applyModeScores` | Move must be behavior-identical. The numeric section above is the contract |
| `fairway/js/domain/courses.js` or `courses.json` | The 100880-byte `COURSES` line | A separate file is a shell-cache change. Do it with the worker, not as a drive-by |
| `fairway/js/round-store.js` | `persistActiveRound`, `.bak`, roster, history | Keep `localStorage` as the copy the marker reads until a designed migration says otherwise. IndexedDB stays a mirror |
| `fairway/js/drive.js` | The Drive client | Token in memory, `drive.file`, schema 3. Room sync must not treat Drive success as room success |
| `fairway/js/nav.js` | History sentinels and the edge guard | Move verbatim. See P1-8 |
| `fairway/js/ui/` | `renderHole`, scorecard, leader, perfil, stats | Strings stay escaped at the boundary |
| Existing `fairway/js/persistence.js` and `shared-*.js` | Already modules | Shared merge is the part the conflict proposal replaces. Do not rewrite it inside a cosmetic split |

`index.html` remains the Pages entry: markup, module scripts, manifest, service worker registration. Product version stays 4.2.6 until a release that is actually shipped.

## Proposal — shared-round conflicts (not implemented)

**Label: proposal only. Do not implement it in the 4.2.6 tree.**

Today is wall-clock last-write-wins on each field, plus last-`POST`-wins on the whole document. That is the source of P0-1, P0-2, and P1-1. A full CRDT library is more machinery than four phones and a 64 KB document need. A pure Lamport counter without retained operation ids still loses a field when a stale `POST` replaces the document and the writer has already thrown the op away.

**Recommended strategy: per-field last-writer-wins registers ordered by a Lamport stamp, with operation ids kept until a later GET echoes them.**

1. Each device stores a monotonic integer `seq` in `localStorage` (not `Date.now()`). Every local edit increments `seq`.
2. An edit is an operation `{ id, key, value, seq, deviceId }`. `value: null` is an explicit clear, so a hole can be taken back. `id` is unique per device (`deviceId` plus `seq` is enough).
3. Compare `(seq, deviceId)` as a total order. Greater `seq` wins. If `seq` ties, the greater `deviceId` wins. There is no “keep whatever this phone already shows” on a tie, because that rule does not converge.
4. The room document stores the folded field map **and** the ids (or the per-device high-water `seq`) that produced it. Folding is commutative: the same set of ops always yields the same map.
5. A client may drop an op from its own log only when a `GET` **after** its `PUT` still contains that op id. Acking the read-back of the `PUT` it just wrote is not enough: another client’s stale `PUT` can land next. `seal`, leave, and “Al día” wait for that following `GET`. If it does not match, merge and `PUT` again, with a bounded retry. This is what makes P0-2 close.
6. Reject `at` / `seq` that are not a device-monotonic counter. Do not accept a client-supplied wall clock as the order key. That is what makes P0-1 close.
7. MantleDB `POST` cannot do compare-and-swap. The retry in step 5 is the whole consistency mechanism until a server exists. Do not add a Fairway server in the same breath as a UI split. Do not report Drive fallback as a successful room write.

This is a small last-writer-wins register (a light CRDT) keyed by Lamport time and device id, plus a short op log so a replaced document can be repaired by any phone that still holds the op. It is not “whatever `Date.now()` was on the last `POST`”.

Worked conflict, two phones, same hole, proposal rules:

- Phone A writes 4 as op `A/1`. Phone B writes 5 as op `B/1`. Neither has seen the other.
- The phone whose `(seq, deviceId)` is greater supplies the value that both eventually show. The loser keeps the winner’s op id in the document, so a third phone that joins later folds the same winner.
- If B’s `POST` accidentally omits `A/1`, A still holds `A/1` and will `PUT` the union on the next attempt. A does not seal the round until a `GET` shows `A/1`.

Worked conflict, current 4.2.6 rules, for comparison: if A’s clock is behind, or A already acked and then closed, B’s document (or a hostile `at`) becomes the card the group sees, and A will not put the stroke back.

## Out of scope for this branch

No product version bump, no scoring edit, no persistence edit, no service-worker edit, no map edit, no Pages workflow, no merge to `main`, no release. The companion measurements are in `docs/fairway-5.0/BASELINE.md`.
