import { Collection, Db, Document, WithId } from 'mongodb';

import { createSequenceGenerator } from './SequenceGenerator';
import { FactReducer, NEW, UnknownFact } from './types';

export interface PersistentView<S, F extends UnknownFact> {
  collectionName: string;
  idField: string;
  reducer: FactReducer<S, F>;
  initialState?: S | null;
}

export interface FactStore<F extends UnknownFact> {
  append: (fact: F) => Promise<F>; // Returns the fact that was actually inserted
  onAppend: (callback: (fact: F) => Promise<void>) => void;
  find: (streamId: number) => AsyncGenerator<WithId<F>, void, unknown>;
  findAll: () => AsyncGenerator<WithId<F>, void, unknown>;
  createTransientView: <S>(reducer: FactReducer<S, F>, initialState: S | null) => (streamId: number) => Promise<S | null>;
  createPersistentView: <S extends Document>(view: PersistentView<S, F>) => Collection<S>;
  mongoDatabase: Db,
}

export interface CreateFactStoreOptions {
  name: string;
}

export async function createFactStore<F extends UnknownFact>(mongoDatabase: Db, options: CreateFactStoreOptions): Promise<FactStore<F>> {
  const {
    name: factStoreName,
  } = options;

  const onAppendListeners: ((fact: F) => Promise<void>)[] = [];

  const sequenceGenerator = createSequenceGenerator(mongoDatabase, `${factStoreName}_ids`);
  sequenceGenerator.init();

  async function append(fact: F): Promise<F> {
    const streamId = fact.streamId === NEW
      ? await sequenceGenerator.nextStreamId()
      : fact.streamId;

    const factId = await sequenceGenerator.nextFactId(streamId);

    const factToSave: F = {
      ...fact,
      streamId,
      sequence: factId,
      time: new Date(),
    };

    await mongoDatabase.collection(factStoreName).insertOne(factToSave);

    // Call all the listeners
    for await (const callback of onAppendListeners) {
      await callback(factToSave);
    }

    return factToSave;
  }

  function onAppend(callback: (fact: F) => Promise<void>) {
    onAppendListeners.push(callback);
  }

  async function* find(streamId: number) {
    const cursor = await mongoDatabase
      .collection<F>(factStoreName)
      .find({ streamId });

    yield* cursor;
  }

  async function* findAll(): AsyncGenerator<F> {
    const cursor = await mongoDatabase
      .collection<F>(factStoreName)
      .find();

    yield* cursor;
  }

  function createTransientView<S>(reducer: FactReducer<S, F>, initialState: S | null = null) {
    return async function(streamId: number) {
      const cursor = await find(streamId);
      let state: S | null = initialState;
      for await (const fact of cursor) {
        state = reducer(state, fact);
      }
      return state;
    }
  }

  function createPersistentView<S extends Document>(view: PersistentView<S, F>) {
    const {
      collectionName,
      idField,
      initialState = null,
      reducer,
    } = view;

    onAppendListeners.push(async (latestFact) => {
      const cursor = await find(latestFact.streamId);
      let state: S | null = initialState;
      for await (const fact of cursor) {
        state = reducer(state, fact);
      }

      if (state === null) {
        await mongoDatabase.collection(collectionName).deleteOne({ [idField]: latestFact.streamId });
      } else {
        await mongoDatabase.collection(collectionName).replaceOne(
          { [idField]: latestFact.streamId },
          state,
          { upsert: true },
        );
      }
    });

    return mongoDatabase.collection<S>(collectionName);
  }

  return {
    append,
    onAppend,
    find,
    findAll,
    createTransientView,
    createPersistentView,
    mongoDatabase,
  };
}
