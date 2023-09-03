import { MongoMemoryServer } from 'mongodb-memory-server';

export const dbName = 'fact_streams_unit_tests';

export async function startMongoInstance(): Promise<{ uri: string, stop: () => void }> {
    // Create an new instance of "MongoMemoryServer" and automatically start it
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    return {
        uri,
        stop: () => mongod.stop(),
    };
}
