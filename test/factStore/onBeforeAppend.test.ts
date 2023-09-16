import { expect } from 'chai';

import { startMongoInstance, dbName } from '../shared/mongodb';
import { connect, createFact, FactStreamsDatabase, NEW } from '../../src';

import { Init, InventoryFact } from '../fixtures/InventoryApp';
import { findAll, sleep } from '../shared/miscUtils';

describe('factStore.onBeforeAppend()', () => {
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

  it('should register multiple callbacks to run in sequence BEFORE the fact has been written in the DB', async () => {
    const store = await db.createFactStore<InventoryFact>({ name: collectionName });

    const tmStart = Date.now();
    let timeOfCallbackOne: number = 0;
    let timeOfCallbackTwo: number = 0;

    // Register the first listener
    store.onBeforeAppend(async (factToSave) => {
      expect(await findAll(store.mongoDatabase, collectionName)).to.be.an('array').and.be.empty;
      timeOfCallbackOne = Date.now();
      await sleep(10); // Wait a bit to ensure we don't have race conditions when testing the order that the listeners execute
      return factToSave;
    });

    // Register the second listener
    store.onBeforeAppend(async (factToSave) => {
      expect(await findAll(store.mongoDatabase, collectionName)).to.be.an('array').and.be.empty;
      timeOfCallbackTwo = Date.now();
      return factToSave;
    });

    // Insert one fact to trigger the listeners
    await store.append(createFact<Init>(NEW, 'init', { name: 'X', description: 'Y' }, { username: 'Alice' }));

    // Both listener have run
    expect(timeOfCallbackOne).to.be.greaterThan(tmStart);
    expect(timeOfCallbackTwo).to.be.greaterThan(tmStart);

    // They have run in sequence
    expect(timeOfCallbackTwo).to.be.greaterThan(timeOfCallbackOne);
  });

  it('should append the fact as it has been changed from the last callback', async () => {
    const store = await db.createFactStore<InventoryFact>({ name: collectionName });

    // Register a listener that changes the fact
    store.onBeforeAppend(async (factToSave) => {
      expect(await findAll(store.mongoDatabase, collectionName)).to.be.an('array').and.be.empty;
      return {
        ...factToSave,
        metadata: {
          username: 'A new random username',
        }
      };
    });

    // Insert one fact to trigger the listeners
    await store.append(createFact<Init>(NEW, 'init', { name: 'X', description: 'Y' }, { username: 'Alice' }));

    // The fact that has been written in the DB is the one returned by the last listener
    const allFactsInStore = await findAll(store.mongoDatabase, collectionName);

    expect(allFactsInStore).to.be.an('array').and.have.lengthOf(1);
    expect(allFactsInStore?.[0]?.data).to.deep.eq({ name: 'X', description: 'Y' });
    expect(allFactsInStore?.[0]?.metadata).to.deep.eq({ username: 'A new random username' });
  });

  xit('should fail gracefully when the callback throws an expected error', async () => {
  });

});
