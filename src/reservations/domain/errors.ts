import { Data } from "effect";

import { type ReservationId } from "./value-objects.ts";

export class InvalidStateTransition extends Data.TaggedError("InvalidStateTransition")<{
  readonly command: string;
  readonly from: string;
  readonly reservationId: ReservationId;
}> {}


export type DomainError = InvalidStateTransition;
