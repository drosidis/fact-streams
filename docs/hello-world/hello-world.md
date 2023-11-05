

## Basic concepts with an example

Let's go through an example, to see how *fact-streams* can help you create a model for an entity in your application. We will model an `invoice` entity.

### Connect to a MongoDB database

First, we need to connect to our database.

```typescript
import { connect } from 'fact-stream';

const db = await connect({
  uri: 'mongodb://localhost:27017/',
  dbName: 'myExample',
});
```

It is recommended, but not required, to create a *single* connection instance for your application and use it to create all the fact stores. It is safe to use this connection outside *fact-stream* if you want to run queries using the MongoDB driver directly.

### Define your fact types

We need to think what facts we want to track over time for each `invoice` in our system and create the corresponding types. For each fact we need to specify a `type` which acts like an identifier and also decide what is the data we want to capture. Noetice that `data` is not always required.

```typescript
import { Fact } from 'fact-stream';

// As meta-data, we want to track who was the user that initiated a change and what was their IP
interface Who {
  username: string;
  ip: string;
}

// One type per fact
type Created = Fact<'created', { recipient: string; dueDate: Date; }, Who>;
type ItemAdded = Fact<'itemAdded', { id: number; name: string; quantity: number, price: number; }, Who>;
type ItemRemoved = Fact<'itemRemoved', { id: number; }, Who>;
type Sent = Fact<'sent', null, Who>;

// A union type that represents any valid fact for this entity
type InvoiceFact = Created | ItemAdded | ItemRemoved | Sent;
```

When working with JavaScript (as opposed to TypeScript) you obviously do not need to create types, however it is critical to think about what facts you want to track.

### Create a fact-store instance

```typescript
const store = await db.createFactStore<InventoryFact>({
  name: 'invoiceFacts',
});
```

A fact store provides a mechanism to append and read facts from individual streams. It is recommended, but not required, that you create only one instance per entity.

### Create commands, that append facts in the DB

```typescript
import { createFact, NEW } from 'fact-stream';

function create = (who: Who, recipient: string, dueDate: Date) {
  const fact = createFact<Created>(NEW, 'created', { recipient, dueDate }, who);
  return store.append(fact);
}

// Or in one-liners if you prefer the code style
const addItem = (who: Who, invoiceId: number, itemId: number, name: string, quantity:number, price:number) => store.append(createFact<ItemAdded>(invoiceId, 'itemAdded', { itemId, name, quantity, price }, who));
const removeItem = (who: Who, invoiceId: number, itemId: number) => store.append(createFact<ItemRemoved>(invoiceId, 'itemRemoved', { itemId }, who));
const send = (who: Who, invoiceId: number) => store.append(createFact<Sent>(invoiceId, 'sent', null, who));
```

This is all we need to write data. Notice how we created *command* functions that have names that make sense in the business context.

### Create one or more reducer functions

```typescript
interface Invoice {
  recipient: string;
  dueDate: Date;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  sentBy: string;
}

// TODO: recuder function
```
### Create a transient view

Transient views read the facts from the fact-store and replay them on-the-fly, using one reducer function.

```typescript
const getInvoice = store.createTransientView(invoiceReducer, null);

// We can now call:
const invoice = await getInvoice(invoiceId);
```

### Create a persistent view

Persistent views are using a MongoDB collection to save the latest state of each entity. They are useful when you want to query across many instances of your entity.

```typescript
const invoiceCollection = store.createPersistentView({
  collectionName: 'invoices',
  invoiceReducer,
});

// We can now call:
const invoices = await invoiceCollection.find({ total: { $gte: 1000 }});
```

### Export your model
```typescript
export default {
  create,
  addItem,
  removeItem,
  send,
  getInvoice,
  invocieCollection,
}
```
