import {
  createDatabase,
  createFact,
  NEW,
} from '.';

import type {
  Fact,
} from '.';
// import { createTransientView } from '../../createTransientView';

async function run() {
  // ------------------ create Database (connection) instance
  const db = await createDatabase({
    uri: '',
    dbName: '',
  });

  type Who = { user: string; }

  // ------------------  Fact types for this model
  type Init = Fact<'init', { name: string; description: string; }, Who>
  type Received = Fact<'received', { quantity: number, cost: number }, Who>
  type Sold = Fact<'sold', { quantity: number, price: number }, Who>
  type Discontinued = Fact<'discontinued', null, Who>

  type InventoryFact = Init | Received | Sold | Discontinued;

  // ------------------  Fact store
  const store = await db.createFactStore<InventoryFact>({
    name: 'collectionName',
  });

  // ------------------  Model: Runtime validation

  // TODO: Runtime validation / sanitisation
  // store.onBeforeAppend((fact) => fact); // Fact or throw
  // store.onBeforeAppend(fromZod());

  // ------------------  Model: Commands
  const init = async (who: Who, name: string, description: string) => store.append(createFact<Init>(NEW, 'init', { name, description }, who));
  const received = async (who: Who, itemId: number, quantity:number, cost:number) => store.append(createFact<Received>(itemId, 'received', { quantity, cost }, who));
  const sold = async (who: Who, itemId: number, quantity:number, price:number) => store.append(createFact<Sold>(itemId, 'sold', { quantity, price }, who));
  const discontinued = async (who: Who, itemId: number) => store.append(createFact<Discontinued>(itemId, 'discontinued', null, who));

  // ------------------  Model: create a reducer function
  interface Item {
    itemId: number;
    name: string;
    description: string;
    stock: number;
  }

  function itemReducer(item: Item | null, fact: InventoryFact): (Item | null) {
    if (fact.type === 'init') {
      return {
        itemId: fact.streamId,
        name: fact.data.name,
        description: fact.data.description,
        stock: 0,
      };
    } else if (item === null) {
      throw new Error('Should never have an event before init');
    } else if (fact.type === 'received') {
      return {
        ...item,
        stock: item.stock + fact.data.quantity,
      };
    } else if (fact.type === 'sold') {
      return {
        ...item,
        stock: item.stock - fact.data.quantity,
      };
    }
    return null;
  }

  // ------------------  Model: Transient view
  // const getItem = createTransientView(store, itemReducer, null);

  // ------------------  Model: Persistent view
  store.onAppend(async (latestFact) => {
    const cursor = await store.find(latestFact.streamId);
    let state: Item | null = null;
    for await (const otherFact of cursor) {
      state = itemReducer(state, otherFact);
    }

    if (state === null) {
      await store.mongoDatabase.collection('items').deleteOne({ itemId: latestFact.streamId });
    } else {
      await store.mongoDatabase.collection('items').updateOne(
        { itemId: latestFact.streamId },
        state,
        { upsert: true }
      );
    }

  });

  const items = store.mongoDatabase.collection('items');

  // ------------------  Sugar syntax to create hybrid view
  // const itemsAuto = createPersistentView(store, itemReducer, 'items', null); // Mongo find functions
  // const itemsAuto = createPersistentView({
  //   factStore: store,
  //   reducer: itemReducer,
  //   persistCollection: 'items',
  //   triggerOn: 'all' | 'stream',
  // }); // Mongo find functions

  // ------------------ Model: test bench
  const itemModel =  {
    init,
    received,
    sold,
    discontinued,
    // getItem,
    items,
  };


  const initFact = await itemModel.init({ user: 'John'}, 'Blue pen', 'Write in style');
  const penId = initFact.streamId;
  await itemModel.received({ user: 'Alice' }, penId, 100, 1000);
  await itemModel.sold({ user: 'Alice' }, penId, 2, 15);

  // const item = await itemModel.getItem(penId);
  // console.log(item?.stock);
  const itemInDb = await items.findOne();
}
