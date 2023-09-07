import { expect } from 'chai';

import setupMongod from './setupMongod';
import { Db } from 'mongodb';

describe('mongodb-memory-server', () => {
  let db: Db;
  let stop: () => void;

  beforeEach(async () => {
    const setup = await setupMongod();
    db = setup.db;
    stop = setup.stop;
  });

  afterEach(async () => {
    await stop();
  });

  it('should start an in-memory mongo instance', async () => {
    // Before each test, the database should be empty
    const before = await db.listCollections().toArray();
    expect(before).to.be.an("array").that.is.empty;

    // Add a document at one collection
    db.collection('myCollection').insertOne({
      someValue: 100,
    });

    // The database should contain only the collection with the just added document
    const after = await db.listCollections().toArray();
    expect(after[0].name).to.eq('myCollection');
  });
});
