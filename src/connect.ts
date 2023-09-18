import { MongoClient } from 'mongodb';

import { createFactStore } from './factStore';
import type { ConnectOptions, CreateFactStoreOptions, FactStreamsDatabase } from './types';

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
