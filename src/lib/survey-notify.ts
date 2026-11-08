import { and, count, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { formResponses, notifications } from "@/db/schema";

// Pemberitahuan dalam situs untuk pembuat Formulir Kustom saat ada jawaban baru.
// Tanpa kolom atau migrasi baru: memakai tabel notifications yang ada, dengan
// relatedEntityType "custom_form" dan relatedEntityId = id formulir.
//
// Satu pemberitahuan BELUM DIBACA per formulir, bukan satu per jawaban: jawaban
// berikutnya hanya memperbarui jumlahnya, jadi formulir yang ramai (atau dibanjiri
// pengisi publik) tidak membanjiri pembuatnya. Setelah dibaca, jawaban berikutnya
// membuat pemberitahuan baru.

export const CUSTOM_FORM_ENTITY = "custom_form";

function bodyFor(n: number): string {
  return n === 1 ? "1 jawaban baru sejak terakhir kamu cek." : `${n} jawaban baru sejak terakhir kamu cek.`;
}

/**
 * Beri tahu pembuat bahwa formulirnya mendapat jawaban. Tidak melempar galat ke
 * pemanggil yang bertanggung jawab menangkapnya (dipanggil di belakang respons).
 * Jawaban dari pembuat sendiri tidak diberitahukan.
 */
export async function notifyCreatorOfResponse(
  form: { id: string; title: string; createdBy: string | null },
  responderId: string | null,
): Promise<void> {
  const creatorId = form.createdBy;
  if (!creatorId || creatorId === responderId) return;

  const [unread] = await db
    .select({ id: notifications.id, createdAt: notifications.createdAt })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, creatorId),
        eq(notifications.relatedEntityType, CUSTOM_FORM_ENTITY),
        eq(notifications.relatedEntityId, form.id),
        eq(notifications.isRead, false),
      ),
    )
    .limit(1);

  if (unread) {
    // Jumlah dihitung dari tabel jawaban (bukan penghitung terpisah), sejak pemberitahuan ini dibuat.
    const since = new Date(unread.createdAt.getTime() - 2000);
    const [row] = await db
      .select({ n: count() })
      .from(formResponses)
      .where(and(eq(formResponses.formId, form.id), gt(formResponses.submittedAt, since)));
    await db
      .update(notifications)
      .set({ body: bodyFor(Math.max(row?.n ?? 1, 1)) })
      .where(eq(notifications.id, unread.id));
    return;
  }

  await db.insert(notifications).values({
    userId: creatorId,
    title: `Jawaban baru: ${form.title}`.slice(0, 200),
    body: bodyFor(1),
    relatedEntityType: CUSTOM_FORM_ENTITY,
    relatedEntityId: form.id,
  });
}
