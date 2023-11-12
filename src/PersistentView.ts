/* eslint-disable @typescript-eslint/ban-ts-comment */
import { FactReducer, FactStore, ObjectId, UnknownFact } from "../src";

type StateResult<S> = S | null | Promise<S | null>;
export default class PersistentView2<S, F extends UnknownFact> {
  // Fields needed to run reducer
  #initialStateCallback: () => StateResult<S>;
  #factCallbacks: Record<string, FactReducer<S, F>>; // fact-type --> function
  #unknownCallback: (state: S | null , fact: F) => StateResult<S>;
  #doneCallback: (state: S | null) => StateResult<S>;

  // Fields needed to persist result
  #factStore: FactStore<F>;
  #collectionName: string;
  #idField: string;

  constructor(factStore: FactStore<F>, collectionName: string) {
    this.#initialStateCallback = () => null;
    this.#factCallbacks = {};
    this.#unknownCallback = (state, fact) => { throw new Error(`Unexpected fact type: "${fact?.type}"`) };
    this.#doneCallback = (state) => state;

    this.#factStore = factStore;
    this.#idField = '_id';
    this.#collectionName = collectionName;

    this.#factStore.onAfterAppend((fact) => this.#process(fact.streamId));
  }

  on<SF extends F>(type: SF['type'], reducer: FactReducer<S, SF>) {
    // @ts-ignore
    this.#factCallbacks[type] = reducer;
    return this;
  }

  onUnknownFact(callback: (state: S | null, fact: F) => S) {
    this.#unknownCallback = callback;
  }

  onDone(callback: (state: S | null) => S) {
    this.#doneCallback = callback;
  }

  // A callback called every time there is a new fact in the fact-store
  #process = async (streamId: ObjectId) => {
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

    // Persist the final state
    if (state === null) {
      await this.collection.deleteOne({ [this.#idField]: streamId });
    } else {
      await this.collection.replaceOne(
        { [this.#idField]: streamId },
        // @ts-ignore
        state,
        { upsert: true },
      );
    }
  };

  get collection() {
    return this.#factStore.mongoDatabase.collection(this.#collectionName);
  }

  get readView() {
    return {
      aggregate: this.collection.aggregate,
      countDocuments: this.collection.countDocuments,
      distinct: this.collection.distinct,
      find: this.collection.find,
      findOne: this.collection.findOne,
      rebuild: this.#process,
    }
  }
}
