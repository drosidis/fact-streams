import { Db, MongoClient } from 'mongodb';

import { FactStore, createFactStore, CreateFactStoreOptions } from './factStore';
import { UnknownFact } from './types';

interface ConnectOptions {
  uri: string;
  dbName: string;
}

export interface FactStreamsDatabase {
  createFactStore: <T extends UnknownFact>(options: CreateFactStoreOptions) => Promise<FactStore<T>>;
  mongoDatabase: Db,
  close: () => Promise<void>;
}

export async function connect(options: ConnectOptions): Promise<FactStreamsDatabase> {
  const { uri, dbName } = options;

  const connection = await MongoClient.connect(uri);

  const mongoDatabase = connection.db(dbName);

  return {
    createFactStore: (options: CreateFactStoreOptions) => createFactStore(mongoDatabase, options),
    mongoDatabase,
    close: () => connection.close(),
  };
}
