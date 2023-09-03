import { MongoClient } from 'mongodb';

import { FactStore, createFactStore, CreateFactStoreOptions } from './factStore';
import { UnknownFact } from './UnknownFact';

interface CreateDatabaseOptions {
  uri: string;
  dbName: string;
}

export interface FactStreamsDatabase {
  createFactStore: <T extends UnknownFact>(options: CreateFactStoreOptions) => Promise<FactStore<T>>;
  close: () => Promise<void>;
}

export async function createDatabase(options: CreateDatabaseOptions): Promise<FactStreamsDatabase> {
  const { uri, dbName } = options;

  const connection = await MongoClient.connect(uri);

  const mongoDatabase = connection.db(dbName);

  return {
    createFactStore: (options: CreateFactStoreOptions) => createFactStore(mongoDatabase, options),
    close: () => connection.close(),
  };
}
