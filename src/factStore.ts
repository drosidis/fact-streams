/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Db, Document, MongoError, ObjectId } from 'mongodb';

import type { CreateFactStoreOptions, FactReducer, FactStore, PersistentView, UnknownFact } from './types';

export const NEW = new ObjectId('000000000000000000000001');

export async function createFactStore<F extends UnknownFact>(mongoDatabase: Db, options: CreateFactStoreOptions): Promise<FactStore<F>> {
  const {
    name: factStoreName,
  } = options;

  const onBeforeAppendListeners: ((fact: F) => Promise<F>)[] = [];
  const onAfterAppendListeners: ((fact: F) => Promise<void>)[] = [];

  // Ensure the collection exists and it has the required index
  try {
    await mongoDatabase.createCollection(factStoreName);
  } catch (error) {
    if (error instanceof MongoError && error.message.startsWith('Collection already exists')) {
      // No-op: the collection already exists
    } else {
      throw error;
    }
  }
  await mongoDatabase.collection(factStoreName).createIndex({ streamId: 1, revision: 1 }, { name: 'streamId_revision', unique: true });

  async function append(fact: F): Promise<F> {
    // Find the latest revision number for this stream
    let newStreamId;
    let newRevision;

    if (NEW.equals(fact.streamId)) {
      newStreamId = new ObjectId();
      newRevision = 1;
    } else {
      const lastFactInDb = await mongoDatabase
        .collection<F>(factStoreName)
        //TODO: why does this type fail?
        // @ts-ignore
        .find({ streamId: fact.streamId })
        .sort({ revision: -1 })
        .limit(1)
        .toArray();

      newStreamId = fact.streamId;
      newRevision = lastFactInDb.length === 0
        ? 1
        : (lastFactInDb[0]?.revision || 0) + 1;
    }

    // Create the Fact that will saved
    let factToSave: F = {
      ...fact,
      streamId: newStreamId,
      revision: newRevision,
      time: new Date(),
    };

    // Run all the validation functions, which might change the fact to be saved
    for await (const callback of onBeforeAppendListeners) {
      factToSave = await callback(factToSave);
    }

    // Optimistic insert
    // TODO: wrap the MongoError with a FactStreams error on duplicates, otherwise throw as is
    // TODO: if duplicate revision, then try again (3 times?)
    await mongoDatabase.collection(factStoreName).insertOne(factToSave);

    // Call all the listeners
    for await (const callback of onAfterAppendListeners) {
      await callback(factToSave);
    }

    return factToSave;
  }

  function onAfterAppend(callback: (fact: F) => Promise<void>) {
    onAfterAppendListeners.push(callback);
  }

  function onBeforeAppend(callback: (fact: F) => Promise<F>) {
    onBeforeAppendListeners.push(callback);
  }

  async function* find(streamId: ObjectId | string) {
    const cursor = await mongoDatabase
      .collection<F>(factStoreName)
      //TODO: why does this type fail?
      // @ts-ignore
      .find({ streamId: new ObjectId(streamId) });

    yield* cursor;
  }

  async function* findAll() {
    const cursor = await mongoDatabase
      .collection<F>(factStoreName)
      .find();

    yield* cursor;
  }

  function createTransientView<S>(reducer: FactReducer<S, F>, initialState: S | null = null) {
    return async function(streamId: ObjectId | string) {
      const cursor = await find(streamId);
      let state: S | null = initialState;
      for await (const fact of cursor) {
        // @ts-ignore
        state = reducer(state, fact);
      }
      return state;
    }
  }

  function createPersistentView<S extends Document>(view: PersistentView<S, F>) {
    const {
      collectionName,
      idField = '_id',
      initialState = null,
      reducer,
    } = view;

    onAfterAppendListeners.push(async (latestFact) => {
      const cursor = await find(latestFact.streamId);
      let state: S | null = initialState;
      for await (const fact of cursor) {
        // @ts-ignore
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
    onAfterAppend,
    onBeforeAppend,
    find,
    findAll,
    createTransientView,
    createPersistentView,
    mongoDatabase,
  };
}
