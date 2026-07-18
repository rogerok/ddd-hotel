import { Data } from "effect";

export class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly cause: unknown;
}> {}

export class InvalidApiResponse extends Data.TaggedError("InvalidApiResponse")<{
  readonly cause: unknown;
}> {}
