import { ObjectId } from "mongodb";
import { UnknownFact } from "./types";

export default function createFact<F extends UnknownFact>(streamId: ObjectId, type: F['type'], data: F['data'], metadata: F['metadata']): F {
  return {
    streamId,
    sequence: -1, // It gets reset before append
    type,
    time: new Date(),
    data,
    metadata,
  } as F;
}
