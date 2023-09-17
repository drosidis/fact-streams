import { Collection, Db, ObjectId, WithId } from "mongodb";

export interface Fact<TFactType extends string, TData = never, TMetadata = never> {
  streamId: ObjectId;
  sequence: number;
  type: TFactType;
  time: Date;
  data: TData;
  metadata: TMetadata;
}

export type UnknownFact = Fact<string, unknown, unknown>;

export type FactReducer<S, F extends UnknownFact> = (state: S | null, fact: F) => (S | null);

export interface PersistentView<S, F extends UnknownFact> {
  collectionName: string;
  idField: string;
  reducer: FactReducer<S, F>;
  initialState?: S | null;
}

export interface FactStore<F extends UnknownFact> {
  append: (fact: F) => Promise<F>; // Returns the fact that was actually inserted
  onAfterAppend: (callback: (fact: F) => Promise<void>) => void;
  onBeforeAppend: (callback: (fact: F) => Promise<F>) => void;
  find: (streamId: ObjectId | string) => AsyncGenerator<WithId<F>, void, unknown>;
  findAll: () => AsyncGenerator<WithId<F>, void, unknown>;
  createTransientView: <S>(reducer: FactReducer<S, F>, initialState: S | null) => (streamId: ObjectId | string) => Promise<S | null>;
  createPersistentView: <S extends Document>(view: PersistentView<S, F>) => Collection<S>;
  mongoDatabase: Db,
}

export const NEW = new ObjectId('000000000000000000000001');
