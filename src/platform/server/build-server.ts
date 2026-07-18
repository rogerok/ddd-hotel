import fastifyStatic from "@fastify/static";
import { ManagedRuntime } from "effect";
import Fastify, { type FastifyInstance } from "fastify";
import { access } from "node:fs/promises";
import { join, resolve } from "node:path";

import { reservationRoutes } from "../../reservations/http/reservation-routes.ts";
import { InMemoryReservationEventStoreLive } from "../../reservations/infrastructure/in-memory-reservation-event-store.ts";

export type BuildServerOptions = {
  readonly logger: boolean;
  readonly serveWeb: boolean;
};

export const buildServer = async ({
  logger,
  serveWeb,
}: BuildServerOptions): Promise<FastifyInstance> => {
  const webRoot = resolve("dist/web");

  if (serveWeb) {
    await access(join(webRoot, "index.html"));
  }

  const fastify = Fastify({ logger });

  if (serveWeb) {
    await fastify.register(fastifyStatic, {
      root: webRoot,
    });
  }

  const runtime = ManagedRuntime.make(InMemoryReservationEventStoreLive);

  fastify.get("/api/health", async (_request, reply) =>
    reply.code(200).send({ status: "ok" }),
  );


  fastify.setErrorHandler((error, request, reply) => {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "FST_ERR_CTP_INVALID_JSON_BODY"
    ) {
      return reply.code(400).send({
        error: {
          _tag: "InvalidRequest",
          message: "Malformed JSON body",
        },
      });
    }

    request.log.error(error);
    return reply.code(500).send({
      error: {
        _tag: "InternalServerError",
        message: "Unexpected server error",
      },
    });
  });

  await fastify.register(reservationRoutes(runtime));

  fastify.addHook("onClose", async () => {
    await runtime.dispose();
  });

  return fastify;
};
