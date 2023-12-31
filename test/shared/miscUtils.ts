import { Db } from "mongodb";
import { UnknownFact } from "../../src/types";

// Sleep for specified milliseconds
export async function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

// Returns true if the collection exists
export async function collectionExists(db: Db, name: string) {
  const allCollections = await db.listCollections().toArray();
  return allCollections.map(c => c.name).includes(name);
}

// Returns an index with the specified name, if it exists
export async function findIndex(db: Db, collectionName: string, indexName: string) {
  const allIndexes = await db.collection(collectionName).indexes();
  return allIndexes.find(index => index.name === indexName);
}

// Return all the documents in a collection
export async function findAll<T extends UnknownFact>(db: Db, name: string) {
  return db
    .collection<T>(name)
    .find()
    .sort({ _id: 1 }) // Since _id includes a timestamp, ensure we return them in the order they were inserted
    .toArray();
}
