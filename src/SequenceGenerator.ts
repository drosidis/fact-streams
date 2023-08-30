import { Db } from 'mongodb';

export interface SequenceGenerator {
    init: (collectionName: string) => Promise<void>;
    nextStreamId: (collectionName: string) => Promise<number>;
    nextFactId: (collectionName: string, streamId: number) => Promise<number>;
}

function nextId(db: Db, collectionName: string, key: string): Promise<number> {
    return db.collection(collectionName).findOneAndUpdate(
        { key },
        { $inc: { value: 1 } },
        { upsert: true, returnDocument: 'after' },
    )
        .then(document => document?.value?.value);
}

export function createSequenceGenerator(db: Db): SequenceGenerator {
    return {
        init: async (collectionName: string) => {
            await db.createCollection(collectionName);
            await db.collection(collectionName).createIndex({ key: 1 }, { name: '_key_' });
        },
        nextStreamId: (collectionName: string) => nextId(db, collectionName, 'streamId'),
        nextFactId: (collectionName: string, streamId: number) => nextId(db, collectionName, `factIdFor_${streamId}`),
    };
}
