# Fact-streams

`fact-streams` is a TypeScript library that makes it very easy to build applications using the *event sourcing* paradigm with [Node.js](https://nodejs.org) and [MongoDB](https://www.mongodb.org/). It provides an alternative to [mongoose](https://mongoosejs.com/) and the CRUD paradigm.

## Documentation

- [Quick introduction to event sourcing and CQRS](docs/crud-vs-event-sourcing/crud-vs-event-sourcing.md). A 5 minute introduction to event-sourcing and CQRS.
- [Basic concepts](docs/basic-concepts/basic-concepts.md). A high level description of core `fact-streams` concepts and key technical decisions then shaped this library.
- [Your first model](docs/hello-world/hello-world.md). A hello-world example model for `fact-streams`.
<!-- - [Crafting commands](docs\crafting-commands\crafting-commands.md). Describes a pragmatic approach to building real-world database models with `fact-streams`. It covers runtime type validation, type coercion and integration with external systems. -->
<!-- - [Read views](). Describes a pragmatic approach to writing the read-views of your models -->

## Installation

With npm:
```
npm i fact-streams
```

With pnpm:
```
pnpm i fact-streams
```

With yarn:
```
yarn add fact-streams
```

## Usage

For usage, check the "hello world" example in the [documentation](/docs/hello-world/).
