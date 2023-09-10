import { expect } from 'chai';

import { startMongoInstance, dbName } from './shared/mongodb';
import { connect, FactStreamsDatabase } from '../src';

import { createFixtures } from './fixtures/InventoryApp';

async function toArray<T>(gen: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = []
  for await(const x of gen) {
    out.push(x);
  }
  return out;
}
describe('factStore', () => {
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

  describe('.findAll()', () => {
    it('should return *all* the *sorted* facts in the store', async () => {
      const { store, penId, pencilId } = await createFixtures(db);

      const allFacts = await toArray(await store.findAll());

      expect(allFacts).to.have.a.lengthOf(5);

      expect(allFacts[0]).to.include({ streamId: penId, sequence: 1, type: 'init' });
      expect(allFacts[1]).to.include({ streamId: pencilId, sequence: 1, type: 'init' });
      expect(allFacts[2]).to.include({ streamId: penId, sequence: 2, type: 'received' });
      expect(allFacts[3]).to.include({ streamId: penId, sequence: 3, type: 'sold' });
      expect(allFacts[4]).to.include({ streamId: pencilId, sequence: 2, type: 'discontinued' });
    });
  });

  describe('.find(streamId)', () => {
    it('should return *all* the *sorted* facts for one stream', async () => {
      const { store, pencilId } = await createFixtures(db);

      const allFacts = await toArray(await store.find(pencilId));

      expect(allFacts).to.have.a.lengthOf(2);

      expect(allFacts[0]).to.include({ streamId: pencilId, sequence: 1, type: 'init' });
      expect(allFacts[1]).to.include({ streamId: pencilId, sequence: 2, type: 'discontinued' });
    });
  });
});
