import { Schema } from "effect";

import { ReservationCommand } from "./domain/commands.ts";
import { ReservationEvent } from "./domain/events.ts";
import {
  DateRange,
  GuestEmail,
  ReservationId,
  RoomNumber,
} from "./domain/value-objects.ts";

export const ReservationCommandRequest = ReservationCommand;
export type ReservationCommandRequest = Schema.Schema.Type<typeof ReservationCommandRequest>;

export const ReservationParams = Schema.Struct({
  reservationId: ReservationId,
});
export type ReservationParams = Schema.Schema.Type<typeof ReservationParams>;

export const ReservationStatus = Schema.Literal(
  "Reserved",
  "CheckedIn",
  "CheckedOut",
  "Cancelled",
);
export type ReservationStatus = Schema.Schema.Type<typeof ReservationStatus>;

export const ReservationView = Schema.Struct({
  guest: GuestEmail,
  range: DateRange,
  reservationId: ReservationId,
  room: RoomNumber,
  status: ReservationStatus,
});
export type ReservationView = Schema.Schema.Type<typeof ReservationView>;

export const ReservationSnapshot = Schema.Struct({
  events: Schema.Array(ReservationEvent),
  reservation: ReservationView,
  version: Schema.NonNegativeInt,
});
export type ReservationSnapshot = Schema.Schema.Type<typeof ReservationSnapshot>;

export const ReservationCommandAccepted = Schema.Struct({
  appendedEvents: Schema.Array(ReservationEvent),
  snapshot: ReservationSnapshot,
});
export type ReservationCommandAccepted = Schema.Schema.Type<
  typeof ReservationCommandAccepted
>;

export const InvalidRequest = Schema.TaggedStruct("InvalidRequest", {
  message: Schema.String,
});
export type InvalidRequest = Schema.Schema.Type<typeof InvalidRequest>;

export const InvalidStateTransitionError = Schema.TaggedStruct("InvalidStateTransition", {
  command: Schema.String,
  from: Schema.String,
  reservationId: ReservationId,
});
export type InvalidStateTransitionError = Schema.Schema.Type<
  typeof InvalidStateTransitionError
>;

export const ReservationNotFoundError = Schema.TaggedStruct("ReservationNotFound", {
  reservationId: ReservationId,
});
export type ReservationNotFoundError = Schema.Schema.Type<
  typeof ReservationNotFoundError
>;

export const StreamVersionConflictError = Schema.TaggedStruct("StreamVersionConflict", {
  actualVersion: Schema.NonNegativeInt,
  expectedVersion: Schema.NonNegativeInt,
  reservationId: ReservationId,
});
export type StreamVersionConflictError = Schema.Schema.Type<
  typeof StreamVersionConflictError
>;

export const InternalServerError = Schema.TaggedStruct("InternalServerError", {
  message: Schema.Literal("Unexpected server error"),
});
export type InternalServerError = Schema.Schema.Type<typeof InternalServerError>;

export const ApiError = Schema.Union(
  InvalidRequest,
  InvalidStateTransitionError,
  ReservationNotFoundError,
  StreamVersionConflictError,
  InternalServerError,
);
export type ApiError = Schema.Schema.Type<typeof ApiError>;

export const ApiErrorResponse = Schema.Struct({
  error: ApiError,
});
export type ApiErrorResponse = Schema.Schema.Type<typeof ApiErrorResponse>;
