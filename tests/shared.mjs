import assert from "assert";
import { readFileSync } from "fs";
import {
  ackPending,
  applyFieldsToPlayers,
  createMemoryMailbox,
  diffPlayers,
  loadShared,
  makeDeviceId,
  mergeFields,
  normalizeCode,
  noteLocalDeltas,
  queueDeltas,
  sanitizeValue,
  sharedStatus,
  stampExisting,
  syncShared
} from "../fairway/js/shared-round.js";
import { createMqttMailbox, encodePublish, parsePublish } from "../fairway/js/shared-mail.js";
import { pickPeer } from "../fairway/js/shared-rtc.js";
import { APP_VERSION, BACKUP_SCHEMA, SHARED_KEY } from "../fairway/js/keys.js";

function player(id, scores, extra) {
  return Object.assign({
    id: id,
    name: id,
    scores: Object.assign({}, scores || {}),
    putts: {},
    fir: {},
    gir: {},
    ball: "",
    withdrawn: false
  }, extra || {});
}

function session(deviceId, code, role) {
  const shared = loadShared(null, deviceId);
  shared.code = code || "";
  shared.role = role || "";
  shared.createdBy = role === "host" ? deviceId : "dHOST0001";
  shared.joinedForeign = role === "join";
  return shared;
}

assert.strictEqual(BACKUP_SCHEMA, 3);
assert.strictEqual(APP_VERSION, "4.2.4");
assert.strictEqual(SHARED_KEY, "fairway.sharedRound.v1");
assert.strictEqual(normalizeCode("k7nq4p"), "K7NQ4P");
assert.strictEqual(normalizeCode("K7NQ4O"), "");
assert.strictEqual(normalizeCode("K7N"), "");
assert.strictEqual(sanitizeValue("scores", 99), undefined);
assert.strictEqual(sanitizeValue("scores", 4), 4);
assert.strictEqual(sanitizeValue("ball", "<b>Pro V1</b>"), "bPro V1/b");

const queued = queueDeltas(
  [{ playerId: "p1", hole: 3, field: "scores", value: 4, at: 100, by: "d1" }],
  [{ playerId: "p1", hole: 3, field: "scores", value: 5, at: 120, by: "d1" }]
);
assert.strictEqual(queued.length, 1);
assert.strictEqual(queued[0].value, 5);

const merged = mergeFields(
  { "p1|3|scores": { v: 5, at: 100, by: "a" } },
  { "p1|3|scores": { v: 6, at: 100, by: "b" }, "p1|4|scores": { v: 4, at: 90, by: "b" } }
);
assert.strictEqual(merged["p1|3|scores"].v, 5);
assert.strictEqual(merged["p1|4|scores"].v, 4);

const kept = applyFieldsToPlayers(
  [player("p1", { 3: 5, 4: 6 })],
  { "p1|3|scores": { v: 4, at: 90, by: "b" } },
  { "p1|3|scores": 100, "p1|4|scores": 100 }
);
assert.strictEqual(kept.players[0].scores[3], 5);
assert.strictEqual(kept.players[0].scores[4], 6);
assert.strictEqual(kept.changed, false);

const newer = applyFieldsToPlayers(
  [player("p1", { 3: 5 })],
  { "p1|3|scores": { v: 6, at: 200, by: "b" }, "p1|1|scores": { v: 4, at: 50, by: "b" } },
  { "p1|3|scores": 100 }
);
assert.strictEqual(newer.players[0].scores[3], 6);
assert.strictEqual(newer.players[0].scores[1], 4);

const hostile = applyFieldsToPlayers(
  [player("p1", { 2: 4 }, { ball: "Titleist" })],
  { "p1|2|scores": { v: 99, at: 999, by: "b" }, "p1||ball": { v: "<script>", at: 999, by: "b" } },
  { "p1|2|scores": 10, "p1||ball": 10 }
);
assert.strictEqual(hostile.players[0].scores[2], 4);
assert.ok(!String(hostile.players[0].ball).includes("<"));

const wiped = diffPlayers(
  [player("p1", { 5: 4 })],
  [player("p1", {})],
  300,
  "d1"
);
assert.strictEqual(wiped.length, 0);

const noted = session("dLOCAL000", "K7NQ4P", "host");
noteLocalDeltas(noted, [player("p1", {})], [player("p1", { 7: 5 })], 400);
assert.strictEqual(noted.pending.length, 1);
assert.strictEqual(noted.stamps["p1|7|scores"], 400);

const still = ackPending(noted.pending, {});
assert.strictEqual(still.length, 1);
const acked = ackPending(noted.pending, { "p1|7|scores": { v: 5, at: 400, by: "dLOCAL000" } });
assert.strictEqual(acked.length, 0);

assert.strictEqual(sharedStatus(session("d1"), false).label, "Solo en este móvil");
const pending = session("d1", "K7NQ4P", "join");
pending.pending = noted.pending.slice();
assert.strictEqual(sharedStatus(pending, false).label, "Pendiente · sin conexión");
assert.strictEqual(sharedStatus(pending, true).id, "pending");

const box = createMemoryMailbox();
const host = session("dHOST0001", "K7NQ4P", "host");
host.createdBy = "dHOST0001";
const hostPlayers = [player("p1", { 1: 4, 2: 6 })];
host.stamps = stampExisting(hostPlayers, {}, 100).stamps;
host.pending = [
  { playerId: "p1", hole: 1, field: "scores", value: 4, at: 100, by: host.deviceId },
  { playerId: "p1", hole: 2, field: "scores", value: 6, at: 150, by: host.deviceId }
];
const meta = { courseId: "la-herreria", club: "La Herrería", tee: "Amarillas", holes: 18, players: hostPlayers };

const offline = await syncShared({
  shared: host,
  players: hostPlayers,
  mailbox: box,
  online: false,
  now: 160,
  meta: meta
});
assert.strictEqual(offline.players[0].scores[1], 4);
assert.strictEqual(offline.shared.pending.length, 2);
assert.strictEqual(box.rooms.size, 0);

const up = await syncShared({
  shared: host,
  players: hostPlayers,
  mailbox: box,
  online: true,
  now: 160,
  meta: meta,
  transport: "mqtt"
});
assert.strictEqual(up.shared.pending.length, 0);
assert.strictEqual(up.shared.status, "synced");
assert.strictEqual(up.players[0].scores[2], 6);

const guest = session("dGUEST000", "K7NQ4P", "join");
guest.createdBy = "dHOST0001";
const guestPlayers = [player("p1", { 3: 5 })];
guest.stamps = stampExisting(guestPlayers, {}, 180).stamps;
guest.pending = [{ playerId: "p1", hole: 3, field: "scores", value: 5, at: 180, by: guest.deviceId }];
const joined = await syncShared({
  shared: guest,
  players: guestPlayers,
  mailbox: box,
  online: true,
  now: 180,
  meta: meta,
  transport: "mqtt"
});
assert.strictEqual(joined.players[0].scores[1], 4);
assert.strictEqual(joined.players[0].scores[2], 6);
assert.strictEqual(joined.players[0].scores[3], 5);
assert.strictEqual(joined.shared.pending.length, 0);

const back = await syncShared({
  shared: up.shared,
  players: up.players,
  mailbox: box,
  online: true,
  now: 190,
  meta: meta
});
assert.strictEqual(back.players[0].scores[1], 4);
assert.strictEqual(back.players[0].scores[3], 5);
assert.strictEqual(back.players[0].scores[2], 6);

const raceBox = createMemoryMailbox();
const a = session(makeDeviceId(() => 0.1), "K7NQ4P", "host");
a.createdBy = a.deviceId;
const aPlayers = [player("p1", { 9: 3 })];
a.stamps = { "p1|9|scores": 300 };
a.pending = [{ playerId: "p1", hole: 9, field: "scores", value: 3, at: 300, by: a.deviceId }];
await syncShared({ shared: a, players: aPlayers, mailbox: raceBox, online: true, now: 300, meta: meta });
const b = session(makeDeviceId(() => 0.2), "K7NQ4P", "join");
b.createdBy = a.deviceId;
const bPlayers = [player("p1", { 9: 4 })];
b.stamps = { "p1|9|scores": 250 };
b.pending = [{ playerId: "p1", hole: 9, field: "scores", value: 4, at: 250, by: b.deviceId }];
const bSync = await syncShared({ shared: b, players: bPlayers, mailbox: raceBox, online: true, now: 260, meta: meta });
assert.strictEqual(bSync.players[0].scores[9], 3);

const stale = session("dGUEST000", "K7NQ4P", "join");
stale.createdBy = "dHOST0001";
const stalePlayers = [player("p1", { 8: 5 })];
stale.stamps = stampExisting(stalePlayers, {}, 500).stamps;
const olderRemote = createMemoryMailbox();
olderRemote.rooms.set("K7NQ4P", {
  v: 1,
  code: "K7NQ4P",
  createdBy: "dHOST0001",
  updatedAt: 100,
  updatedBy: "dHOST0001",
  meta: { courseId: "la-herreria", holes: 18, players: [{ id: "p1", name: "p1" }] },
  fields: { "p1|8|scores": { v: 4, at: 100, by: "dHOST0001" } },
  presence: {},
  signals: []
});
const keptLocal = await syncShared({
  shared: stale,
  players: stalePlayers,
  mailbox: olderRemote,
  online: true,
  now: 500,
  meta: meta
});
assert.strictEqual(keptLocal.players[0].scores[8], 5);

assert.strictEqual(pickPeer("d1", { d1: { at: 100 }, d2: { at: 90 }, d3: { at: 10 } }, 100), "d2");
assert.strictEqual(pickPeer("d1", { d2: { at: 10 } }, 30000), "");

const published = encodePublish("fairway/v1/room/K7NQ4P", "{\"ok\":1}", true);
const parsed = parsePublish(published);
assert.strictEqual(parsed.topic, "fairway/v1/room/K7NQ4P");
assert.strictEqual(parsed.retain, true);
assert.strictEqual(parsed.payload, "{\"ok\":1}");

class FakeWS {
  constructor() {
    this.readyState = 0;
    this.sent = [];
    queueMicrotask(() => {
      this.readyState = 1;
      if (this.onopen) this.onopen();
    });
  }
  send(buf) {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    this.sent.push(bytes);
    const type = bytes[0] >> 4;
    if (type === 1) this.onmessage({ data: new Uint8Array([0x20, 0x02, 0x00, 0x00]).buffer });
    if (type === 8) {
      this.onmessage({ data: new Uint8Array([0x90, 0x03, 0x00, 0x01, 0x00]).buffer });
      const room = {
        v: 1,
        code: "K7NQ4P",
        createdBy: "dOTHER000",
        updatedAt: 10,
        updatedBy: "dOTHER000",
        meta: { courseId: "la-herreria", holes: 18, players: [] },
        fields: { "p1|1|scores": { v: 4, at: 10, by: "dOTHER000" } },
        presence: {},
        signals: []
      };
      const packet = encodePublish("fairway/v1/room/K7NQ4P", JSON.stringify(room), true);
      this.onmessage({ data: packet.buffer.slice(packet.byteOffset, packet.byteOffset + packet.byteLength) });
    }
  }
  close() { this.readyState = 3; }
}

const mqtt = createMqttMailbox({ WebSocket: FakeWS, retainWaitMs: 30, url: "wss://example.test/mqtt", clientId: "fwtest" });
const remote = await mqtt.get("K7NQ4P");
assert.ok(remote);
assert.strictEqual(remote.fields["p1|1|scores"].v, 4);
mqtt.close();

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const boot = readFileSync(new URL("../fairway/js/shared-boot.js", import.meta.url), "utf8");
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
assert.ok(boot.includes("Partida compartida"));
assert.ok(readFileSync(new URL("../fairway/js/shared-round.js", import.meta.url), "utf8").includes("Pendiente · sin conexión"));
assert.ok(html.includes('id="sharedRoundHome"'));
assert.ok(html.includes("fairwaySharedAfterPersist"));
assert.ok(html.includes("fairway/js/shared-boot.js"));
assert.ok(html.includes('aria-label="Versión">4.2.4</span>'));
assert.ok(html.includes("version: 3"));
assert.ok(html.includes("function fairwayNavDecide"));
assert.ok(!html.includes("client_secret"));
assert.ok(!html.includes('id="holeBagBtn"'));
assert.ok(sw.includes('const SHELL = "fairway-v4-424"'));
assert.ok(sw.includes("fairway/js/shared-boot.js"));
assert.ok(readFileSync(new URL("../fairway/js/shared-mail.js", import.meta.url), "utf8").includes("wss://test.mosquitto.org:8081/mqtt"));
assert.ok(!readFileSync(new URL("../fairway/js/shared-mail.js", import.meta.url), "utf8").includes("@"));

console.log("shared ok");
