import { observer } from "mobx-react-lite";

import { type ReservationWorkbenchViewModel } from "./ReservationWorkbenchViewModel.ts";

export const EventStreamPanel = observer(function EventStreamPanel({
  viewModel,
}: {
  readonly viewModel: ReservationWorkbenchViewModel;
}) {
  const events = viewModel.snapshot?.events ?? [];

  return (
    <section aria-labelledby="events-heading" className="panel event-panel">
      <div className="panel-number">3</div>
      <div className="event-heading-row">
        <div>
          <h2 id="events-heading">Events</h2>
          <p className="panel-intro">
            Append-only journal. Порядок событий и payload — единственный source of truth.
          </p>
        </div>
        <span className="version">version {viewModel.snapshot?.version ?? 0}</span>
      </div>

      {events.length === 0 ? (
        <p className="empty-copy">Journal пуст. Начните с <code>PlaceReservation</code>.</p>
      ) : (
        <ol className="event-list">
          {events.map((event, index) => (
            <li key={`${event._tag}-${event.occurredAt}-${index}`}>
              <div className="event-meta">
                <span>#{index + 1}</span>
                <code>{event._tag}</code>
              </div>
              <time dateTime={new Date(event.occurredAt).toISOString()}>
                occurredAt {event.occurredAt}
              </time>
              <pre>{JSON.stringify(event, null, 2)}</pre>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
});
