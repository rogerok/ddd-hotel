import { Schema } from "effect";
import { type FastifyInstance } from "fastify";

import { buildServer } from "../../../src/platform/server/build-server.ts";
import {
  ApiErrorResponse,
  ReservationCommandAccepted,
  ReservationSnapshot,
} from "../../../src/reservations/contracts.ts";

const id = "res_http0001";
const placePayload = {
  _tag: "PlaceReservation",
  guest: "http@example.com",
  range: { checkIn: "2026-09-01", checkOut: "2026-09-03" },
  reservationId: id,
  room: "101",
};

const withServer = async (
  run: (server: FastifyInstance) => Promise<void>,
): Promise<void> => {
  const server = await buildServer({ logger: false, serveWeb: false });

  try {
    await run(server);
  } finally {
    await server.close();
  }
};

describe("reservation HTTP routes", () => {
  it("returns InvalidRequest for malformed JSON", async () => {
    await withServer(async (server) => {
      const response = await server.inject({
        headers: { "content-type": "application/json" },
        method: "POST",
        payload: '{"_tag":',
        url: "/api/reservations/commands",
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        error: { _tag: "InvalidRequest", message: "Malformed JSON body" },
      });
    });
  });

  it("returns InvalidRequest for a schema-invalid command", async () => {
    await withServer(async (server) => {
      const response = await server.inject({
        method: "POST",
        payload: { ...placePayload, reservationId: "bad" },
        url: "/api/reservations/commands",
      });
      const body = Schema.decodeUnknownSync(ApiErrorResponse)(response.json());

      expect(response.statusCode).toBe(400);
      expect(body.error._tag).toBe("InvalidRequest");
      if (body.error._tag === "InvalidRequest") {
        expect(body.error.message).toContain("ReservationId");
      }
    });
  });

  it("serves platform health and reports an unknown stream", async () => {
    await withServer(async (server) => {
      const health = await server.inject({ method: "GET", url: "/api/health" });
      const missing = await server.inject({
        method: "GET",
        url: `/api/reservations/${id}`,
      });

      expect(health.statusCode).toBe(200);
      expect(health.json()).toEqual({ status: "ok" });
      expect(missing.statusCode).toBe(404);
      expect(missing.json()).toEqual({
        error: { _tag: "ReservationNotFound", reservationId: id },
      });
    });
  });

  it("encodes an accepted PlaceReservation", async () => {
    await withServer(async (server) => {
      const response = await server.inject({
        method: "POST",
        payload: placePayload,
        url: "/api/reservations/commands",
      });
      const body = Schema.decodeUnknownSync(ReservationCommandAccepted)(response.json());

      expect(response.statusCode).toBe(200);
      expect(body.appendedEvents).toHaveLength(1);
      expect(body.appendedEvents.at(0)?._tag).toBe("ReservationPlaced");
      expect(body.snapshot).toMatchObject({
        reservation: {
          guest: "http@example.com",
          range: placePayload.range,
          reservationId: id,
          room: "101",
          status: "Reserved",
        },
        version: 1,
      });
    });
  });

  it("rejects duplicate PlaceReservation without changing the snapshot", async () => {
    await withServer(async (server) => {
      await server.inject({
        method: "POST",
        payload: placePayload,
        url: "/api/reservations/commands",
      });
      const duplicate = await server.inject({
        method: "POST",
        payload: placePayload,
        url: "/api/reservations/commands",
      });
      const snapshot = await server.inject({
        method: "GET",
        url: `/api/reservations/${id}`,
      });
      const unchangedSnapshot = Schema.decodeUnknownSync(ReservationSnapshot)(
        snapshot.json(),
      );

      expect(duplicate.statusCode).toBe(409);
      expect(duplicate.json()).toEqual({
        error: {
          _tag: "InvalidStateTransition",
          command: "PlaceReservation",
          from: "Reserved",
          reservationId: id,
        },
      });
      expect(snapshot.statusCode).toBe(200);
      expect(unchangedSnapshot.version).toBe(1);
      expect(unchangedSnapshot.events).toHaveLength(1);
    });
  });

  it("reschedules, checks in, checks out, and returns the final projection", async () => {
    await withServer(async (server) => {
      const commands = [
        placePayload,
        {
          _tag: "RescheduleReservation",
          range: { checkIn: "2026-09-02", checkOut: "2026-09-05" },
          reservationId: id,
        },
        { _tag: "CheckInGuest", reservationId: id },
        { _tag: "CheckOutGuest", reservationId: id },
      ];

      for (const payload of commands) {
        const response = await server.inject({
          method: "POST",
          payload,
          url: "/api/reservations/commands",
        });
        expect(response.statusCode).toBe(200);
      }

      const response = await server.inject({
        method: "GET",
        url: `/api/reservations/${id}`,
      });
      const snapshot = Schema.decodeUnknownSync(ReservationSnapshot)(response.json());

      expect(response.statusCode).toBe(200);
      expect(snapshot.version).toBe(4);
      expect(snapshot.events.map((event) => event._tag)).toEqual([
        "ReservationPlaced",
        "ReservationRescheduled",
        "GuestCheckedIn",
        "GuestCheckedOut",
      ]);
      expect(snapshot.reservation).toEqual({
        guest: "http@example.com",
        range: { checkIn: "2026-09-02", checkOut: "2026-09-05" },
        reservationId: id,
        room: "101",
        status: "CheckedOut",
      });
    });
  });
});
