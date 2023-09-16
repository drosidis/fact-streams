import { expect } from 'chai';

import { connect, FactStreamsDatabase } from '../../src';
import { UnknownFact } from '../../src/types';
import { startMongoInstance, dbName } from '../shared/mongodb';
import { collectionExists } from '../shared/miscUtils';

describe('createFactStore()', () => {
  const collectionName = 'unitTestInventoryFacts';
  let db: FactStreamsDatabase;
  let stop: () => void;

  beforeEach(async () => {
    // Launch a new mongod instance
    const mongoInstance = await startMongoInstance();
    stop = mongoInstance.stop;

    // Create a FactStream database connection to mongod instance
    db = await connect({
      uri: mongoInstance.uri,
      dbName,
    });
  });

  afterEach(async () => {
    await db.close();
    await stop();
  });

  it('should ensure that the "facts" collection exists and that it has a unique index on streamId and sequence', async () => {
    const store = await db.createFactStore<UnknownFact>({ name: collectionName });

    // Collection should be created (if it does not exist already)
    expect(await collectionExists(store.mongoDatabase, collectionName)).to.be.true;

    // Check that we have the index we need
    const allIndexes = await store.mongoDatabase.collection(collectionName).indexes();
    const index = await allIndexes.find(index => index.name === 'streamId_sequence');

    expect(index).to.exist;
    expect(index?.key).to.deep.eq({ streamId: 1, sequence: 1 });
    expect(index?.unique).to.be.true;
  });

  it('should create multiple instances for the same collection without an error', async () => {
    await db.createFactStore<UnknownFact>({ name: collectionName });
    await db.createFactStore<UnknownFact>({ name: collectionName });

    // The collection should be created (if it does not exist already)
    expect(await collectionExists(db.mongoDatabase, collectionName)).to.be.true;

    // Check that we have the index we need
    const allIndexes = await db.mongoDatabase.collection(collectionName).indexes();
    const indexNames = allIndexes.map(index => index.name);

    expect(indexNames)
      .to.be.an('array').and
      .to.have.lengthOf(2).and
      .to.contain('_id_').and
      .to.contain('streamId_sequence');
  });
});
