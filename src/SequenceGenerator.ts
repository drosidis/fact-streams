import { Db } from 'mongodb';

export interface SequenceGenerator {
    init: () => Promise<void>;
    nextStreamId: () => Promise<number>;
    nextFactId: (streamId: number) => Promise<number>;
}

function nextId(db: Db, collectionName: string, key: string): Promise<number> {
    return db.collection(collectionName).findOneAndUpdate(
        { key },
        { $inc: { value: 1 } },
        { upsert: true, returnDocument: 'after' },
    )
        .then(document => document?.value?.value);
}

export function createSequenceGenerator(db: Db, collectionName: string): SequenceGenerator {
    return {
        init: async () => {
            await db.createCollection(collectionName);
            await db.collection(collectionName).createIndex({ key: 1 }, { name: '_key_' });
        },
        nextStreamId: () => nextId(db, collectionName, 'streamId'),
        nextFactId: (streamId: number) => nextId(db, collectionName, `factIdFor_${streamId}`),
    };
}
