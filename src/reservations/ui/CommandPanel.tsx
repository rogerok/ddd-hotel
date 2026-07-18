import { observer } from "mobx-react-lite";

import {
  type ReservationCommandTag,
  type ReservationWorkbenchViewModel,
} from "./ReservationWorkbenchViewModel.ts";

const commands: ReadonlyArray<ReservationCommandTag> = [
  "PlaceReservation",
  "RescheduleReservation",
  "CheckInGuest",
  "CheckOutGuest",
  "CancelReservation",
];

export const CommandPanel = observer(function CommandPanel({
  viewModel,
}: {
  readonly viewModel: ReservationWorkbenchViewModel;
}) {
  const showPlacementFields = viewModel.selectedCommand === "PlaceReservation";
  const showDateFields =
    showPlacementFields || viewModel.selectedCommand === "RescheduleReservation";
  const pending = viewModel.requestState === "pending";

  return (
    <section aria-labelledby="command-heading" className="panel command-panel">
      <div className="panel-number">1</div>
      <h2 id="command-heading">Command</h2>
      <p className="panel-intro">
        Сформируйте намерение. Schema проверит wire-данные до вызова Decider.
      </p>

      <label>
        Reservation ID
        <input
          onChange={(event) => {
            viewModel.reservationId = event.currentTarget.value;
          }}
          value={viewModel.reservationId}
        />
      </label>

      <fieldset>
        <legend>Команда</legend>
        <div className="command-palette">
          {commands.map((command) => (
            <label className="command-option" key={command}>
              <input
                checked={viewModel.selectedCommand === command}
                name="command"
                onChange={() => {
                  viewModel.selectedCommand = command;
                }}
                type="radio"
                value={command}
              />
              <code>{command}</code>
            </label>
          ))}
        </div>
      </fieldset>

      {showPlacementFields ? (
        <>
          <label>
            Гость
            <input
              onChange={(event) => {
                viewModel.guest = event.currentTarget.value;
              }}
              type="email"
              value={viewModel.guest}
            />
          </label>
          <label>
            Номер комнаты
            <input
              onChange={(event) => {
                viewModel.room = event.currentTarget.value;
              }}
              value={viewModel.room}
            />
          </label>
        </>
      ) : null}

      {showDateFields ? (
        <div className="date-fields">
          <label>
            Заезд
            <input
              onChange={(event) => {
                viewModel.checkIn = event.currentTarget.value;
              }}
              type="date"
              value={viewModel.checkIn}
            />
          </label>
          <label>
            Выезд
            <input
              onChange={(event) => {
                viewModel.checkOut = event.currentTarget.value;
              }}
              type="date"
              value={viewModel.checkOut}
            />
          </label>
        </div>
      ) : null}

      <div className="button-row">
        <button
          className="primary"
          disabled={pending}
          onClick={() => {
            void viewModel.execute();
          }}
          type="button"
        >
          Decide + Append
        </button>
        <button
          disabled={pending}
          onClick={() => {
            void viewModel.load();
          }}
          type="button"
        >
          Load / Replay
        </button>
        <button disabled={pending} onClick={() => { viewModel.reset(); }} type="button">
          Reset stream ID
        </button>
      </div>
      <p className="hint">
        Все команды доступны намеренно: запрещённый переход должен дать typed rejection,
        но не событие.
      </p>
    </section>
  );
});
