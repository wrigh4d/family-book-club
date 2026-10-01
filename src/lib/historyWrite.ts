/**
 * Firestore rejects Transaction.set() / WriteBatch.set() that include
 * deleteField() unless options include `{ merge: true }`.
 * History writes clear legacy `notes` while writing `comments[]`.
 */
export function historySetWithNotesClear(
  dataWithoutNotes: Record<string, unknown>,
  clearNotes: unknown,
): { data: Record<string, unknown>; options: { merge: true } } {
  return {
    data: { ...dataWithoutNotes, notes: clearNotes },
    options: { merge: true },
  }
}
