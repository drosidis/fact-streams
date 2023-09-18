export { ObjectId } from 'mongodb';

export { connect } from './connect';
export { createFact } from './createFact';
export { NEW } from './factStore';

export type {
  Fact,
  UnknownFact,
  FactReducer,
  PersistentView,
  FactStore,
  CreateFactStoreOptions,
  FactStreamsDatabase,
  ConnectOptions,
} from './types';
