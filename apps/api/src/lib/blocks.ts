/** İki kullanıcı arasında (her iki yönde) engel var mı? */
export async function areBlocked(db: D1Database, a: string, b: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 FROM blocks
       WHERE (blocker_id = ?1 AND blocked_id = ?2) OR (blocker_id = ?2 AND blocked_id = ?1)
       LIMIT 1`,
    )
    .bind(a, b)
    .first();
  return !!row;
}
