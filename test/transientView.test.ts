import { expect } from 'chai';

import { startMongoInstance, dbName } from './shared/mongodb';
import { connect, FactReducer, FactStreamsDatabase } from '../src';

import { InventoryFact, createFixtures } from './fixtures/InventoryApp';

describe('factStore.createTransientView()', () => {
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

  it('should create a function that runs the reducer on any single fact stream', async () => {
    const { store, penId, pencilId } = await createFixtures(db);

    interface InventoryItem {
      label: string;
      description: string;
      stock: number;
      totalCost: number;
      totalSales: number;
    }

    const reducer: FactReducer<InventoryItem, InventoryFact> = (item, fact) => {
      if (fact.type === 'init') {
        return {
          label: fact.data.name,
          description: fact.data.description,
          stock: 0,
          totalCost: 0,
          totalSales: 0,
        }
      } else if (item === null) {
        throw new Error('Missing `init` fact at the beginning of the stream');
      } else if (fact.type === 'received') {
        return {
          ...item,
          stock: item.stock + fact.data.quantity,
          totalCost: item.totalCost + fact.data.cost,
        };
      } else if (fact.type === 'sold') {
        return {
          ...item,
          stock: item.stock - fact.data.quantity,
          totalSales: item.totalSales + fact.data.price,
        };
      } else if (fact.type === 'discontinued') {
        return null;
      } else {
        // Ignore all other fact types
        return item;
      }
    }

    const getItem = store.createTransientView(reducer, null);

    expect(await getItem(penId)).to.deep.eq({
      label: 'Pen',
      description: 'For persistent writing',
      stock: 18,
      totalCost: 150,
      totalSales: 20,
    });
  });
});
