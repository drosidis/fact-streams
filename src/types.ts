import Fact from "./Fact";

export type UnknownFact = Fact<string, unknown, unknown>;

export const NEW = -1 as const;

export type FactReducer<S, F extends UnknownFact> = (state: S | null, fact: F) => (S | null);
