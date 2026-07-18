import { type JSX, useState } from "react";

import { CommandPanel } from "./CommandPanel.tsx";
import { DecisionStatePanel } from "./DecisionStatePanel.tsx";
import { EventStreamPanel } from "./EventStreamPanel.tsx";
import { FetchReservationsApi } from "./reservations-api.ts";
import { ReservationWorkbenchViewModel } from "./ReservationWorkbenchViewModel.ts";

export function ReservationWorkbench(): JSX.Element {
  const [api] = useState(() => new FetchReservationsApi("/api"));
  const [viewModel] = useState(() => new ReservationWorkbenchViewModel(api));

  return (
    <main>
      <header className="hero">
        <p className="eyebrow">Functional event sourcing · Effect · Fastify · MobX</p>
        <h1>Reservation Decider Lab</h1>
        <p>
          Исследуйте канонический цикл <code>initial → decide → events → evolve</code>.
          Rejected-команды остаются вне immutable event stream.
        </p>
      </header>

      <div aria-label="Command to events pipeline" className="pipeline">
        <CommandPanel viewModel={viewModel} />
        <DecisionStatePanel viewModel={viewModel} />
        <EventStreamPanel viewModel={viewModel} />
      </div>
    </main>
  );
}
