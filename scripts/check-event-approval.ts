import assert from "node:assert/strict";
import {
  creatorHasCapability,
  eventApprovalState,
  grantsCreatorRights,
  isEventApproved,
  isReleaseTransition,
  isUnapprovedDraft,
} from "../src/lib/event-capabilities";
import { eventLifecycle, eventPreparationNote, eventStatusChip } from "../src/lib/event-stage";

const at = new Date("2026-11-04T12:00:00+08:00");
const draft = { status: "draft", approvedAt: null, approvalRequestedAt: null };

// Cara acara tampil ke publik. "cancelled" termasuk, supaya draf yang dibatalkan bukan jalan pintas.
for (const from of ["draft", "scheduled", "cancelled"]) {
  for (const to of ["scheduled", "published", "registration_closed", "completed"]) {
    assert.equal(isReleaseTransition(from, to), true, `${from} -> ${to}`);
  }
  assert.equal(isReleaseTransition(from, "draft"), false);
  assert.equal(isReleaseTransition(from, "cancelled"), false);
}
assert.equal(isReleaseTransition("published", "registration_closed"), false);
assert.equal(isReleaseTransition("registration_closed", "published"), false);
assert.equal(isReleaseTransition("published", "draft"), false);

assert.equal(isEventApproved(draft), false);
assert.equal(isEventApproved({ status: "cancelled", approvedAt: null }), false);
assert.equal(isEventApproved({ status: "draft", approvedAt: at }), true);
assert.equal(isEventApproved({ status: "published", approvedAt: null }), true);

assert.equal(eventApprovalState(draft), "belum");
assert.equal(eventApprovalState({ ...draft, approvalRequestedAt: at }), "diajukan");
assert.equal(eventApprovalState({ ...draft, approvalRequestedAt: at, approvedAt: at }), "disetujui");
// Pengajuan yang tertinggal di acara yang sudah bukan draf tidak bisa diputuskan lagi.
assert.equal(eventApprovalState({ ...draft, status: "cancelled", approvalRequestedAt: at }), "belum");

// Acara lama (hasil backfill: disetujui tanpa penyetuju) dan acara batal tidak memberi hak pembuat.
assert.equal(grantsCreatorRights({ status: "published", approvedAt: at, approvedBy: null }), false);
assert.equal(grantsCreatorRights({ status: "completed", approvedAt: null, approvedBy: null }), false);
assert.equal(grantsCreatorRights({ status: "cancelled", approvedAt: null, approvedBy: null }), false);
assert.equal(grantsCreatorRights({ status: "published", approvedAt: at, approvedBy: "bph" }), true);
assert.equal(grantsCreatorRights({ status: "draft", approvedAt: null, approvedBy: null }), true);

assert.equal(isUnapprovedDraft(draft), true);
assert.equal(isUnapprovedDraft({ status: "draft", approvedAt: at }), false);
assert.equal(isUnapprovedDraft({ status: "cancelled", approvedAt: null }), false);

// Draf percobaan tidak boleh membuka data orang lain.
assert.equal(creatorHasCapability(false, "event.viewRegistrants"), false);
assert.equal(creatorHasCapability(false, "event.editInfo"), true);
assert.equal(creatorHasCapability(false, "event.publish"), true);
assert.equal(creatorHasCapability(true, "event.editInfo"), true);
assert.equal(creatorHasCapability(true, "event.viewRegistrants"), true);
// Baik sebelum maupun sesudah disetujui: tidak bisa mengangkat panitia, termasuk dirinya
// sendiri jadi Ketua, dan tidak membuka daftar semua akun, keuangan, atau hak BPH Kabinet.
for (const capability of [
  "event.manageCommittee",
  "event.editCredits",
  "event.manageVolunteers",
  "event.exportRegistrants",
  "event.viewAuditLog",
  "event.manageFinance",
  "event.postArticle",
  "event.approve",
  "event.delete",
  "event.takeOver",
] as const) {
  assert.equal(creatorHasCapability(true, capability), false, capability);
  assert.equal(creatorHasCapability(false, capability), false, capability);
}

assert.equal(eventStatusChip(draft, "persiapan").label, "Draf");
assert.equal(eventStatusChip({ ...draft, approvalRequestedAt: at }, "persiapan").label, "Menunggu Persetujuan");
assert.equal(eventStatusChip({ ...draft, approvedAt: at }, "persiapan").label, "Draf · Disetujui");
assert.equal(eventStatusChip({ ...draft, status: "scheduled" }, "persiapan").label, "Terjadwal");
assert.equal(eventStatusChip({ ...draft, status: "cancelled" }, "dibatalkan").tone, "alarm");
assert.equal(eventStatusChip({ ...draft, status: "registration_closed" }, "tayang").label, "Pendaftaran Ditutup");

assert.equal(eventPreparationNote({ ...draft, scheduledPublishAt: null }), "Belum diajukan ke BPH");
assert.equal(eventPreparationNote({ ...draft, approvalRequestedAt: at, scheduledPublishAt: null }), "Menunggu persetujuan BPH");
assert.equal(eventPreparationNote({ ...draft, approvedAt: at, scheduledPublishAt: null }), "Rilis belum dijadwalkan");
assert.equal(eventPreparationNote({ ...draft, status: "scheduled", scheduledPublishAt: at }), "Rilis 4 Nov 2026");

const schedule = { ...draft, startAt: null, endAt: null, scheduledPublishAt: null, registrationDeadline: null };
assert.equal(eventLifecycle(schedule, at)[0].note, "Belum diajukan ke BPH");
assert.equal(eventLifecycle({ ...schedule, status: "published", startAt: new Date("2026-12-01T10:00:00+08:00") }, at)[0].note, null);

console.log("Event approval checks passed.");
