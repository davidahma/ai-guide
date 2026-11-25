// Teaching reducer for one synthetic stream with contiguous source positions.
// Persist its returned cursor and inbox together before acknowledging a page.
export function reconcileIntake(state, page, { fromSourceJournal = false } = {}) {
  const unresolved = { ...state, history: "unknown" };
  if (page.truncated || page.after !== state.cursor) return unresolved;
  if (state.history === "unknown" && !fromSourceJournal) return unresolved;

  const inbox = [...state.inbox];
  let cursor = state.cursor;
  for (const event of page.events) {
    const previous = inbox.find(({ eventId }) => eventId === event.eventId);
    if (previous) {
      if (previous.position !== event.position || previous.caseId !== event.caseId) return unresolved;
      continue;
    }
    if (event.position !== cursor + 1) return unresolved;
    inbox.push(event);
    cursor = event.position;
  }
  if (cursor !== page.through) return unresolved;
  return { cursor, inbox, history: "reconciled" };
}

export function dispatchQueuedIntake(state, eventId, currentPermission) {
  const item = state.inbox.find((event) => event.eventId === eventId);
  if (!item) return "unknown_event";
  if (state.history !== "reconciled") return "history_unknown";
  return currentPermission(item) === true ? "authorized" : "revoked";
}
