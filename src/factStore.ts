import { Db, FindCursor, WithId } from 'mongodb';

import Fact from './Fact';
import { createSequenceGenerator } from './SequenceGenerator';
import { FactReducer, NEW, UnknownFact } from './types';

export interface FactStore<F extends Fact<string, unknown, unknown>> {
  append: (fact: F) => Promise<F>; // Returns the fact that was actually inserted
  onAppend: (callback: (fact: F) => Promise<void>) => void;
  find: (streamId: number) => AsyncGenerator<WithId<F>, void, unknown>;
  findAll: () => AsyncGenerator<WithId<F>, void, unknown>;
  createTransientView: <S>(reducer: FactReducer<S, F>, initialState: S | null) => (streamId: number) => Promise<S | null>;
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
  };

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
  }

  function createTransientView<S>(reducer: FactReducer<S, F>, initialState: S | null) {
    return async function(streamId: number) {
      const cursor = await find(streamId);
      let state: S | null = initialState;
      for await (const fact of cursor) {
        state = reducer(state, fact);
      }
      return state;
    }
  }

  return {
    append,
    onAppend,
    find,
    findAll,
    createTransientView,
    mongoDatabase,
  };
}
