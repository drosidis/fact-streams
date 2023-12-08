import { Db, FindCursor, ObjectId, WithId } from "mongodb";

export interface Fact<TFactType extends string, TData = never, TMetadata = never> {
  streamId: ObjectId;
  revision: number;
  type: TFactType;
  time: Date;
  data: TData;
  metadata: TMetadata;
}

export type UnknownFact = Fact<string, unknown, unknown>;

export type FactReducer<S, F extends UnknownFact> = (state: S | null, fact: F) => S | null | Promise<S | null>;

export interface FactStore<F extends UnknownFact> {
  append: (fact: F) => Promise<F>; // Returns the fact that was actually inserted
  onAfterAppend: (callback: (fact: F) => Promise<void>) => void;
  onBeforeAppend: (callback: (fact: F) => Promise<F>) => void;
  find: (streamId: ObjectId | string) => FindCursor<WithId<F>>;
  findAll: () => FindCursor<WithId<F>>;
  createTransientView: <S>(reducer: FactReducer<S, F>, initialState: S | null) => (streamId: ObjectId | string) => Promise<S | null>;
  mongoDatabase: Db,
}

export interface CreateFactStoreOptions {
  name: string;
}

export interface FactStreamsDatabase {
  createFactStore: <T extends UnknownFact>(options: CreateFactStoreOptions) => Promise<FactStore<T>>;
  mongoDatabase: Db,
  close: () => Promise<void>;
}

export interface ConnectOptions {
  uri: string;
  dbName: string;
}
