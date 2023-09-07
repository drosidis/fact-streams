import { NEW, UnknownFact } from "./types";

export default function createFact<F extends UnknownFact>(streamId: number, type: F['type'], data: F['data'], metadata: F['metadata']): F {
  return {
    streamId,
    sequence: NEW,
    type,
    time: new Date(),
    data,
    metadata,
  } as F;
}
