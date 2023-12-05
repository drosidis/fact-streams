import { NEW, ObjectId, createFact } from '../../src';
import { Fact, FactStore } from '../../src/types';

/**
 * Fixtures that model a ticket tracking application.
 * Each item has a title, an estimated size in points and a status
 */

// --------------- Define metadata ---------------

// For all facts we will record who took the action, and store it in fact.metadata
export interface Who {
  username: string;
}

// A few characters
export const alice: Who = { username: 'Alice' };
export const bob: Who = { username: 'Bob' };
export const charlie: Who = { username: 'Charlie' };

// --------------- Define fact types ---------------

// We define 4 types of facts
export type Created = Fact<'created', { title: string; points: number; }, Who>;
export type ChangedDetails = Fact<'changedDetails', { title: string; points: number; }, Who>;
export type Completed = Fact<'completed', null, Who>
export type Deleted = Fact<'deleted', null, Who>

// We also define a type for any our inventory facts
export type TicketFact = Created | ChangedDetails | Completed | Deleted;

// --------------- Read-view type ---------------
export interface Ticket {
  _id: ObjectId;
  title: string;
  points: number;
  status: 'to-do' | 'done';
}

// --------------- Some commands ---------------

// Set up a scenario of 2 streams (each representing a ticket) with a few facts each
export async function appendFixtureFacts(store: FactStore<TicketFact>) {
  // Create three streams by inserting the first fact for each one
  const createFirst = await store.append(createFact<Created>(NEW, 'created', { title: 'Create homepage', points: 5 }, alice));
  const id1 = createFirst.streamId;

  const createSecond = await store.append(createFact<Created>(NEW, 'created', { title: 'Add images', points: 2 }, bob));
  const id2 = createSecond.streamId;

  const createThird = await store.append(createFact<Created>(NEW, 'created', { title: 'Add favicon', points: 1 }, charlie));
  const id3 = createThird.streamId;

  // Add a few facts to each stream
  await store.append(createFact<ChangedDetails>(id1, 'changedDetails', { title: 'Create all pages', points: 8 }, bob));
  await store.append(createFact<Deleted>(id2, 'deleted', null, charlie));
  await store.append(createFact<Completed>(id1, 'completed', null, charlie));
  await store.append(createFact<ChangedDetails>(id3, 'changedDetails', { title: 'Add favicon', points: 2 }, bob));

  return { store, id1, id2, id3 };
}
