export { ObjectId } from 'mongodb';

export { connect } from './connect';
export { createFact } from './createFact';
export { NEW } from './factStore';
export { default as PersistentView } from './PersistentView';

export type {
  Fact,
  UnknownFact,
  FactReducer,
  FactStore,
  CreateFactStoreOptions,
  FactStreamsDatabase,
  ConnectOptions,
} from './types';
