import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';

export default async function setupMongod(): Promise<{ db: Db, stop: () => void }> {
  // Create an new instance of "MongoMemoryServer" and automatically start it
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const connection = await MongoClient.connect(uri);

  return {
    db: connection.db('fact_streams_test'),
    stop: () => {
      connection.close();
      mongod.stop();
    },
  };
}
