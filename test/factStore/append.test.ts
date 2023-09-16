import { expect } from 'chai';

import { startMongoInstance, dbName } from '../shared/mongodb';
import { connect, createFact, FactStreamsDatabase, NEW } from '../../src';

import { Init, InventoryFact, Received, Sold } from '../fixtures/InventoryApp';
import { findAll, sleep } from '../shared/miscUtils';
import { MongoError } from 'mongodb';

describe('factStore.append()', () => {
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

  it('should fail when a race condition would result in duplicate fact sequence for the same stream', async () => {
    const store = await db.createFactStore<InventoryFact>({ name: collectionName });

    // Deliberately create a race condition, by making sure that by the time the first fact we will insert
    // has finished running the "onBeforeAppend" callbacks, the second fact is already in the database
    store.onBeforeAppend(async (fact) => {
      await sleep(fact.type === 'received' ? 20 : 5);
      return fact;
    });

    // Create a stream in the store
    const f1 = await store.append(createFact<Init>(NEW, 'init', { name: 'X', description: 'Y' }, { username: 'Alice' }));

    // Start appending two events in parallel. The first one will complete in 20ms and the second in 5ms, therefore we expect the first one to fail
    // Notice the lack of the `await` keyword here, which is important to trigger the two functions to run in parallel.
    const insertOne = store.append(createFact<Received>(f1.streamId, 'received', { quantity: 1, cost: 10 }, { username: 'Bob' }));
    const insertTwo = store.append(createFact<Sold>(f1.streamId, 'sold', { quantity: 1, price: 20 }, { username: 'Charlie' }));
    await Promise.all([
      insertOne
        .then(() => expect.fail('It should not have succeeded'))
        .catch((err) => {
          expect(err).to.be.instanceOf(MongoError);
          expect(err.message).to.match(/E11000/);
        }),
      insertTwo
        .then((savedFact) => expect(savedFact).contain({ type: 'sold', sequence: 2 }))
        .catch((err) => { throw err }),
    ])

    // Double check that the store contains only two facts (the 'received' one was rejected)
    const allFacts = await findAll(store.mongoDatabase, collectionName);

    expect(allFacts).to.be.an('array').and.have.lengthOf(2);
    expect(allFacts[0]).to.contain({ type: 'init', sequence: 1 });
    expect(allFacts[1]).to.contain({ type: 'sold', sequence: 2 });
  });

  it('should wait for all callbacks to return', async () => {
    const store = await db.createFactStore<InventoryFact>({ name: collectionName });

    let countOfRuns = 0;

    // Add a delay on every append
    store.onAppend(async () => {
      await sleep(10);
      countOfRuns += 1;
    });

    // Append a few events
    const tmStart = Date.now();
    await store.append(createFact<Init>(NEW, 'init', { name: 'X1', description: 'Y' }, { username: 'Alice' }));
    await store.append(createFact<Init>(NEW, 'init', { name: 'X2', description: 'Y' }, { username: 'Bob' }));
    await store.append(createFact<Init>(NEW, 'init', { name: 'X3', description: 'Y' }, { username: 'Charlie' }));
    await store.append(createFact<Init>(NEW, 'init', { name: 'X4', description: 'Y' }, { username: 'Daniel' }));

    // Check that the callback has been called and has returned
    expect(countOfRuns).to.eq(4);
    expect(Date.now() - tmStart).to.be.greaterThanOrEqual(40);
  });
});
