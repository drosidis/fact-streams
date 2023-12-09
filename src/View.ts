/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Collection, WithId } from "mongodb";

import type { FactReducer, FactStore, ObjectId, UnknownFact } from "../src";

type StateResult<S> = S | null | Promise<S | null>;

export default class View<S, F extends UnknownFact> {
  #factStore: FactStore<F>;
  #initialStateCallback: () => StateResult<S>;
  #factCallbacks: Record<string, FactReducer<S, F>>; // fact-type --> function
  #unknownCallback: (state: S | null , fact: F) => StateResult<S>;
  #doneCallback: (state: S | null) => StateResult<S>;

  constructor(factStore: FactStore<F>) {
    this.#factStore = factStore;

    this.#initialStateCallback = () => null;
    this.#factCallbacks = {};
    this.#unknownCallback = (state, fact) => { throw new Error(`Unexpected fact type: "${fact?.type}"`) };
    this.#doneCallback = (state) => state;
  }

  on<SF extends F>(type: SF['type'], reducer: FactReducer<S, SF>) {
    // @ts-ignore
    this.#factCallbacks[type] = reducer;
    return this;
  }

  onUnknownFact(callback: (state: S | null, fact: F) => StateResult<S>) {
    this.#unknownCallback = callback;
    return this;
  }

  onDone(callback: (state: S | null) => StateResult<S>) {
    this.#doneCallback = callback;
    return this;
  }

  async #replayFacts(streamId: ObjectId) {
    // Create a cursor to iterate over all facts for this stream
    const cursor = await this.#factStore.find(streamId);

    // Get initial state
    let state = await this.#initialStateCallback();

    // Apply each fact on the state
    for await (const fact of cursor) {
      const reducerForType = this.#factCallbacks[fact.type];
      if (reducerForType) {
        // @ts-ignore
        state = await reducerForType(state, fact);
      } else {
        // @ts-ignore
        state = await this.#unknownCallback(state, fact);
      }
    }

    // Do any final clean up
    state = await this.#doneCallback(state);

    return state;
  }

  async #rebuild(collection: Collection<WithId<S>>, streamId: ObjectId) {
    const state = await this.#replayFacts(streamId);

    // Persist the final state
    if (state === null) {
      // @ts-ignore
      await collection.deleteOne({ _id: streamId });
    } else {
      await collection.replaceOne(
        // @ts-ignore
        { _id: streamId },
        state,
        { upsert: true },
      );
    }
  }

  async createPersistent(collectionName: string) {
    const collection = this.#factStore.mongoDatabase.collection<WithId<S>>(collectionName);

    this.#factStore.onAfterAppend(fact => this.#rebuild(collection, fact.streamId));

    return {
      aggregate: collection.aggregate.bind(collection),
      countDocuments: collection.countDocuments.bind(collection),
      distinct: collection.distinct.bind(collection),
      find: collection.find.bind(collection),
      findOne: collection.findOne.bind(collection),

      collection,
      replayFacts: (streamId: ObjectId) => this.#replayFacts(streamId),
      rebuild: (streamId: ObjectId) => this.#rebuild(collection, streamId),
    }
  }

  async createTransient() {
    return (streamId: ObjectId) => this.#replayFacts(streamId);
  }
}
