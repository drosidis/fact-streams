import { FactStreamsDatabase, NEW, createFact } from '../../src';
import { Fact, FactStore } from '../../src/types';

/**
 * Fixtures to model an Inventory app, to track the items in a warehouse
 */

// For all facts we will record who took the action, and store it in fact.metadata
export interface Who {
  username: string;
}

// We define 4 types of facts
export type Init = Fact<'init', { name: string; description: string; }, Who>;
export type Received = Fact<'received', { quantity: number; cost: number; }, Who>;
export type Sold = Fact<'sold', { quantity: number; price: number; }, Who>;
export type Discontinued = Fact<'discontinued', null, Who>

// We also define a type for any our inventory facts
export type InventoryFact = Init | Received | Sold | Discontinued;

// A few characters
export const alice: Who = { username: 'Alice' };
export const bob: Who = { username: 'Bob' };
export const charlie: Who = { username: 'Charlie' };

// Set up a scenario of 2 streams (representing inventory items) with a few facts each
export async function createFixtures(db: FactStreamsDatabase) {
  // Create a FactStore instance
  const store = await db.createFactStore<InventoryFact>({
    name: 'unitTestInventoryFacts',
  });

  return appendFacts(store);
}

// Set up a scenario of 2 streams (representing inventory items) with a few facts each
export async function appendFacts(store: FactStore<InventoryFact>) {
  // Create two streams by inserting the first fact for each one
  const initPens = createFact<Init>(NEW, 'init', { name: 'Pen', description: 'For persistent writing' }, alice);
  const f1 = await store.append(initPens);
  const penId = f1.streamId;

  const initPencils = createFact<Init>(NEW, 'init', { name: 'Pencil', description: 'For transient writing' }, charlie);
  const f2 = await store.append(initPencils);
  const pencilId = f2.streamId;

  await store.append(createFact<Received>(penId, 'received', { quantity: 20, cost: 150 }, alice));
  await store.append(createFact<Sold>(penId, 'sold', { quantity: 2, price: 20 }, bob));
  await store.append(createFact<Discontinued>(pencilId, 'discontinued', null, bob));

  return { store, penId, pencilId };
}
