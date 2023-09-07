import { Db, FindCursor, WithId } from 'mongodb';

import Fact from './Fact';
import NEW from './NewId';
import { createSequenceGenerator } from './SequenceGenerator';
import { UnknownFact } from './UnknownFact';

export interface FactStore<F extends Fact<string, unknown, unknown>> {
  append: (fact: F) => Promise<F>; // Returns the fact that was actually inserted
  onAppend: (callback: (fact: F) => Promise<void>) => void;
  find: (streamId: number) => Promise<FindCursor<WithId<F>>>;
  findAll: () => Promise<FindCursor<WithId<F>>>;
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

  async function find(streamId: number) {
    return mongoDatabase
      .collection<F>(factStoreName)
      .find({ streamId });
  }

  async function findAll() {
    return mongoDatabase
      .collection<F>(factStoreName)
      .find();
  }

  function onAppend(callback: (fact: F) => Promise<void>) {
    onAppendListeners.push(callback);
  }

  return {
    append,
    onAppend,
    find,
    findAll,
    mongoDatabase,
  };
}
