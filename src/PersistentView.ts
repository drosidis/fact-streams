import { FactReducer, FactStore, UnknownFact } from "../src";

export default class PersistentView2<S, F extends UnknownFact> {
  #factStore: FactStore<F>;
  #collectionName: string;
  #idField: string;
  #initialState: S | null;
  #onUnknownCallback: (fact: F) => S = (fact) => { throw new Error(`Unexpected fact type ${fact?.type}`) };

  #reducerFunctions: Record<string, FactReducer<S, F>> = {}; // type --> function

  #reducer: FactReducer<S, F> = (state, fact) => {
    const typeReducer = this.#reducerFunctions[fact.type];
    if (typeReducer) {
      return typeReducer(state, fact);
    } else {
      return this.#onUnknownCallback(fact);
    }
  }

  constructor(args: {
    factStore: FactStore<F>;
    collectionName: string;
    idField?: string;
    initialState?: S | null;
  }) {
    this.#factStore = args.factStore;
    this.#collectionName = args.collectionName;
    this.#idField = args.idField || '_id';
    this.#initialState = args.initialState || null;

    this.#factStore.onAfterAppend(this.#process);
  }

  on = <SF extends F>(type: SF['type'], reducer: FactReducer<S, SF>) => {
    this.#reducerFunctions[type] = reducer;
    return this;
  }

  onUnknownFact = (callback: (fact: F) => S) => {
    this.#onUnknownCallback = callback;
  }

  #process = async (fact: F) => {
    const cursor = await this.#factStore.find(fact.streamId);
    let state: S | null = this.#initialState;
    for await (const fact of cursor) {
      state = await this.#reducer(state, fact);
    }

    if (state === null) {
      await this.#factStore.mongoDatabase.collection(this.#collectionName).deleteOne({
        [this.#idField]: fact.streamId,
      });
    } else {
      await this.#factStore.mongoDatabase.collection(this.#collectionName).replaceOne(
        { [this.#idField]: fact.streamId },
        state,
        { upsert: true },
      );
    }
  };


  get readView() {
    const collection = this.#factStore.mongoDatabase.collection(this.#collectionName);

    return {
      aggregate: collection.aggregate,
      countDocuments: collection.countDocuments,
      distinct: collection.distinct,
      find: collection.find,
      findOne: collection.findOne,
    }
  }

  get collection() {
    return this.#factStore.mongoDatabase.collection(this.#collectionName);
  }
}
