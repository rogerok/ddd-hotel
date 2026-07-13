import { Data } from "effect";

import { type ReservationId } from "./types.ts";

export class InvalidStateTransition extends Data.TaggedError("InvalidStateTransition")<{
  readonly command: string;
  readonly from: string;
  readonly reservationId: ReservationId;
}> {}
