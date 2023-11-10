import { expect } from 'chai';

import { FactStreamsDatabase, PersistentView, connect } from '../src';
import { dbName, startMongoInstance } from './shared/mongodb';
import { Discontinued, Init, InventoryFact, Received, Sold, appendFacts } from './fixtures/InventoryApp';

describe('PersistentView', () => {
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

  // TODO: should throw an error by default on unknown fact types
  // TODO: should allow me to ignore unknown fact types

  it('should create a function that runs the reducer on any single fact stream', async () => {
    const store = await db.createFactStore<InventoryFact>({ name: 'unitTestInventoryFacts' });

    interface InventoryItem {
      label: string;
      description: string;
      stock: number;
      totalCost: number;
      totalSales: number;
    }

    const view = new PersistentView<InventoryItem, InventoryFact>({ factStore: store, collectionName: 'invoices' })
      .on<Init>('init', (item, fact) => {
        return {
          label: fact.data.name,
          description: fact.data.description,
          stock: 0,
          totalCost: 0,
          totalSales: 0,
        };
      })
      .on<Received>('received', (item, fact) => {
        if (item === null) throw new Error('item should never be null at this point');
        return {
          ...item,
          stock: item.stock + fact.data.quantity,
          totalCost: item.totalCost + fact.data.cost,
        };
      })
      .on<Sold>('sold', (item, fact) => {
        if (item === null) throw new Error('item should never be null at this point');
        return {
          ...item,
          stock: item.stock - fact.data.quantity,
          totalSales: item.totalSales + fact.data.price,
        };
      })
      .on<Discontinued>('discontinued', () => null);

    // Create some facts
    const { penId } = await appendFacts(store);

    // Fetch the read-view
    const allItems = await view.collection.find().toArray();

    expect(allItems.length).to.eq(1);
    expect(String(allItems[0]?._id)).to.eq(String(penId));
    expect(allItems[0]).to.contain({
      label: 'Pen',
      description: 'For persistent writing',
      stock: 18,
      totalCost: 150,
      totalSales: 20
    });
  });
});
