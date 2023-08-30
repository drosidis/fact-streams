import { expect } from 'chai';
import { MongoClient, Db } from 'mongodb';

import { startMongoInstance, dbName } from './shared/mongodb';
import { createSequenceGenerator } from '../src/SequenceGenerator';

describe('IdGenerator', () => {
    // Two mock collections that store the IDs for two distinct fact-stores
    const collectionOne = 'testFactStore_ids';
    const collectionTwo = 'anotherTestFactStore_ids';

    let uri: string;
    let stop: () => void;
    let connection: MongoClient;
    let db: Db;

    beforeEach(async () => {
        // Launch a new mongod instance
        const mongoInstance = await startMongoInstance();
        stop = mongoInstance.stop;
        uri = mongoInstance.uri;

        // Connect to that mongod instance
        connection = await MongoClient.connect(uri);
        db = await connection.db(dbName);
    });

    afterEach(async () => {
        await connection.close();
        await stop();
    });

    it('should generate new IDs that start at one and are unique per store and per stream', async () => {
        const generator = createSequenceGenerator(db);

        expect(await generator.nextStreamId(collectionOne)).to.eq(1);
        expect(await generator.nextStreamId(collectionOne)).to.eq(2);
        expect(await generator.nextStreamId(collectionOne)).to.eq(3);

        expect(await generator.nextFactId(collectionOne, 1)).to.eq(1);
        expect(await generator.nextFactId(collectionOne, 1)).to.eq(2);

        expect(await generator.nextFactId(collectionOne, 2)).to.eq(1);
    });

    it('should generate unique IDs that are unique per fact-store, but not across fact-stores', async () => {
        const generator = createSequenceGenerator(db);

        expect(await generator.nextStreamId(collectionOne)).to.eq(1);
        expect(await generator.nextStreamId(collectionTwo)).to.eq(1);

        expect(await generator.nextStreamId(collectionOne)).to.eq(2);
        expect(await generator.nextStreamId(collectionTwo)).to.eq(2);

        expect(await generator.nextFactId(collectionOne, 1)).to.eq(1);
        expect(await generator.nextFactId(collectionTwo, 1)).to.eq(1);

        expect(await generator.nextFactId(collectionOne, 1)).to.eq(2);
        expect(await generator.nextFactId(collectionTwo, 1)).to.eq(2);
    });

    it('should create the correct DB index for the collection that holds ids when init() is called', async () => {
        // Sugar syntax: returns true of the collection exists
        const collectionExists = async (name: string) => (await db.listCollections().toArray()).map(c => c.name).includes(name);

        expect(await collectionExists(collectionOne)).to.be.false;

        const generator = createSequenceGenerator(db);
        await generator.init(collectionOne);

        expect(await collectionExists(collectionOne)).to.be.true;

        // The collection have the appropriate indexes
        const indexes = await db.collection(collectionOne).indexes();
        expect(indexes).to.have.lengthOf(2);

        const indexOnKey = indexes.find(doc => doc.name === '_key_');
        expect(indexOnKey?.key).to.deep.eq({ key: 1 });
    });
});
