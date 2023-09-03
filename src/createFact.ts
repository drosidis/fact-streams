import { NEW } from ".";
import { UnknownFact } from "./UnknownFact";

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