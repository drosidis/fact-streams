import { expect } from 'chai';

import { FactStore, FactStreamsDatabase, View, connect } from '../src';
import { dbName, startMongoInstance } from './shared/mongodb';
import { appendFixtureFacts } from './fixtures/ticketTrackingApp';
import type { ChangedDetails, Completed, Created, Deleted, Ticket, TicketFact } from './fixtures/ticketTrackingApp';
import { collectionExists, findIndex } from './shared/miscUtils';

function createCoreView(store: FactStore<TicketFact>) {
  return new View<Ticket, TicketFact>(store)
    .on<Created>('created', (ticket, fact) => {
      return {
        _id: fact.streamId,
        title: fact.data.title,
        points: fact.data.points,
        status: 'to-do',
      };
    })
    .on<ChangedDetails>('changedDetails', (ticket, fact) => {
      if (ticket === null) throw new Error('ticket should never be null at this point');
      return {
        ...ticket,
        title: fact.data.title,
        points: fact.data.points,
      };
    })
    .on<Completed>('completed', (ticket) => {
      if (ticket === null) throw new Error('ticket should never be null at this point');
      return {
        ...ticket,
        status: 'done',
      };
    })
    .on<Deleted>('deleted', () => null);
}

describe('View', () => {
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

  // TODO: builder
  //    It should return immutable objects from all functions, so that I can fork the view
  //    It should allow me to override anything
  //    It should throw an error by default on unknown fact types
  //    It should allow me to ignore unknown fact types
  //    It should allow `onDone`
  //    It should allow both sync and async reducers

  describe('createPersistent()', () => {
    // TODO:
    //    It should create the collection even before I append an event
    //    It should expose all mongoDb read functions: find, findOne, count, distinct, aggregate, count
    //    It should expose a `replay(streamId)` function
    //    It should expose a `replay(streamId, untilDate)` function
    //    It should expose the collection

    it('should ensure that the read-view collection is in sync with the fact store', async () => {
      const store = await db.createFactStore<TicketFact>({ name: 'unitTestTicketFacts' });
      const view = await createCoreView(store).createPersistent('tickets');

      // Add some facts
      const { id1, id3 } = await appendFixtureFacts(store);

      // Check that all read-views are correct
      const allTickets = await view.collection.find().sort({ id: 1 }).toArray();

      expect(allTickets).to.have.lengthOf(2);

      expect(allTickets[0]).to.deep.equal({
        _id: id1,
        title: 'Create all pages',
        points: 8,
        status: 'done',
      });

      expect(allTickets[1]).to.deep.equal({
        _id: id3,
        title: 'Add favicon',
        points: 2,
        status: 'to-do',
      });
    });

    it('should make it possible to create an index on the read-view collection even before the first fact has been inserted', async () => {
      const store = await db.createFactStore<TicketFact>({ name: 'unitTestTicketFacts' });
      const view = await createCoreView(store).createPersistent('tickets');

      // Create an index
      view.collection.createIndex({ title: 1 }, { name: 'testIndex' });

      // Check that the index exist before we insert the first fact
      const indexBefore = await findIndex(db.mongoDatabase, 'tickets', 'testIndex');
      expect(indexBefore).to.exist.and.to.deep.contain({ key: { title: 1 } });

      // The collection will have been created as a result of adding the index
      expect(await collectionExists(db.mongoDatabase, 'tickets')).to.be.true;
    });

    it('should expose the `find()` function of the underlying mongoDb read-view collection', async () => {
      const store = await db.createFactStore<TicketFact>({ name: 'unitTestTicketFacts' });
      const view = await createCoreView(store).createPersistent('tickets');
      const { id1, id3 } = await appendFixtureFacts(store);

      const allTickets = await view.find().toArray();
      const ids = allTickets.map(t => String(t._id));

      expect(allTickets).to.have.lengthOf(2);
      expect(ids).to.deep.equal([String(id1), String(id3)]);
    });
  });

  describe('createTransient()', () => {
    it('should be able to replay all facts for a stream', async () => {
      const store = await db.createFactStore<TicketFact>({ name: 'unitTestTicketFacts' });
      const replay = await createCoreView(store).createTransient();
      const { id1, id3 } = await appendFixtureFacts(store);

      const ticket1 = await replay(id1);
      expect(ticket1).to.deep.equal({
        _id: id1,
        title: 'Create all pages',
        points: 8,
        status: 'done',
      });

      const ticket3 = await replay(id3);
      expect(ticket3).to.deep.equal({
        _id: id3,
        title: 'Add favicon',
        points: 2,
        status: 'to-do',
      });
    });

    xit('should be able to replay all facts for a stream up to a certain timestamp', async () => {
      // TODO: add implementation and tests
    });
  });
});
