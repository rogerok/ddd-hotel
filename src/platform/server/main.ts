import { NodeRuntime } from "@effect/platform-node";
import { Effect } from "effect";

import { buildServer } from "./build-server.ts";

const program = Effect.acquireRelease(
  Effect.tryPromise({
    try: () =>
      buildServer({
        logger: true,
        serveWeb: process.env.NODE_ENV === "production",
      }),
    catch: (cause) => new Error("Failed to build server", { cause }),
  }),
  (fastify) => Effect.promise(() => fastify.close()),
).pipe(
  Effect.flatMap((fastify) =>
    Effect.tryPromise({
      try: () =>
        fastify.listen({
          host: process.env.HOST ?? "127.0.0.1",
          port: Number(process.env.PORT ?? 3000),
        }),
      catch: (cause) => new Error("Failed to listen", { cause }),
    }).pipe(Effect.zipRight(Effect.never)),
  ),
  Effect.scoped,
);

NodeRuntime.runMain(program);
