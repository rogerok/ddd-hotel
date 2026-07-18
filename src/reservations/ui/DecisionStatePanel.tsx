import { observer } from "mobx-react-lite";

import { type ReservationWorkbenchViewModel } from "./ReservationWorkbenchViewModel.ts";

export const DecisionStatePanel = observer(function DecisionStatePanel({
  viewModel,
}: {
  readonly viewModel: ReservationWorkbenchViewModel;
}) {
  const reservation = viewModel.snapshot?.reservation;
  const state = reservation?.status ?? "NotPlaced";

  return (
    <section aria-labelledby="state-heading" className="panel state-panel">
      <div className="panel-number">2</div>
      <h2 id="state-heading">Decide / State</h2>
      <p className="panel-intro">
        История replay-ится в aggregate state. Decider либо выпускает события, либо typed
        error.
      </p>

      <div className={`state-badge state-${state.toLowerCase()}`}>{state}</div>

      {reservation ? (
        <dl className="facts">
          <div>
            <dt>Reservation</dt>
            <dd>{reservation.reservationId}</dd>
          </div>
          <div>
            <dt>Guest</dt>
            <dd>{reservation.guest}</dd>
          </div>
          <div>
            <dt>Room</dt>
            <dd>{reservation.room}</dd>
          </div>
          <div>
            <dt>Range</dt>
            <dd>
              {reservation.range.checkIn} → {reservation.range.checkOut}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="empty-copy">Сохранённых событий для текущего stream пока нет.</p>
      )}

      <div aria-atomic="true" aria-live="polite" className="outcome">
        <h3>Последний outcome</h3>
        {viewModel.requestState === "pending" ? <p>Decider выполняется…</p> : null}
        {viewModel.outcome?._tag === "Accepted" ? (
          <div className="outcome-accepted">
            <strong>Accepted</strong>
            <span>
              {viewModel.outcome.command}: appended {viewModel.outcome.appendedEvents}
            </span>
          </div>
        ) : null}
        {viewModel.outcome?._tag === "Rejected" ? (
          <div className="outcome-rejected">
            <strong>{viewModel.outcome.error}</strong>
            <span>{viewModel.outcome.message}</span>
            <small>History не изменилась.</small>
          </div>
        ) : null}
        {!viewModel.outcome && viewModel.requestState === "idle" ? (
          <p className="muted">Команда ещё не выполнялась.</p>
        ) : null}
      </div>
    </section>
  );
});
