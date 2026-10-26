import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { eventFeeOptions, eventQuestions, eventRegistrations, events, sensusProfiles, users } from "@/db/schema";
import { buildRegistrationExport, type RegistrationExport, type RegistrationExportRow } from "@/lib/registration-export";

/** Ambil data pendaftar sebuah acara dari database. null = acara tidak ada. */
export async function loadRegistrationExport(
  eventId: string,
  origin: string,
): Promise<{ eventTitle: string; data: RegistrationExport } | null> {
  const [event] = await db
    .select({ title: events.title, earlyBirdUntil: events.earlyBirdUntil })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) return null;

  const [rows, questions, feeOptions] = await Promise.all([
    db
      .select({
        name: users.name,
        email: users.email,
        status: eventRegistrations.status,
        registeredAt: eventRegistrations.registeredAt,
        branch: eventRegistrations.branch,
        answersJson: eventRegistrations.answersJson,
        feeOptionId: eventRegistrations.feeOptionId,
        biodataJson: eventRegistrations.biodataJson,
        // Kota/kampus/WeChat untuk acara tanpa blok biodata (mis. Fun Hike
        // requiresSensus — pertanyaan itu tidak ditanya ulang di form).
        sensusBranch: sensusProfiles.branch,
        sensusCompletion: sensusProfiles.completionStatus,
        sensusUniversity: sensusProfiles.university,
        sensusWechat: sensusProfiles.wechatId,
      })
      .from(eventRegistrations)
      .leftJoin(users, eq(eventRegistrations.userId, users.id))
      .leftJoin(sensusProfiles, eq(sensusProfiles.userId, eventRegistrations.userId))
      .where(eq(eventRegistrations.eventId, eventId))
      .orderBy(desc(eventRegistrations.registeredAt)),
    db.select({ id: eventQuestions.id, label: eventQuestions.label }).from(eventQuestions).where(eq(eventQuestions.eventId, eventId)),
    db
      .select({
        id: eventFeeOptions.id,
        label: eventFeeOptions.label,
        amountCny: eventFeeOptions.amountCny,
        earlyBirdAmountCny: eventFeeOptions.earlyBirdAmountCny,
      })
      .from(eventFeeOptions)
      .where(eq(eventFeeOptions.eventId, eventId)),
  ]);

  return {
    eventTitle: event.title,
    data: buildRegistrationExport({
      rows: rows as RegistrationExportRow[],
      questions,
      feeOptions,
      earlyBirdUntil: event.earlyBirdUntil,
      origin,
    }),
  };
}
