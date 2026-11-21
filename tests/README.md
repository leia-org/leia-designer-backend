# Regression and integration tests

Implements [development #114](https://github.com/leia-org/development/issues/114).

```sh
npm ci
npm run test:regression
```

`npm test` runs the same finite suite; `npm run test:watch` is available for development. CI runs the regression command on Node 22 and 24 for pull requests and pushes to `main`/`develop`, without service credentials.

HTTP activity publication, ownership, published-draft immutability, empty activities, validation and cursor/search forwarding. The real router, auth, controller and service run against a mocked repository; existing tests also run.

External side effects are replaced at the database, HTTP adapter/fetch, Redis or model-provider boundary. No MongoDB, Redis server or paid model API is needed. These tests complement browser and deployed-stack end-to-end tests.

## Integration tests

```sh
npm run test:integration
```

Real routes/services/repositories create activities, attach stored LEIAs, populate Auth profiles over HTTP, publish and enforce ownership/immutability. MongoDB unique indexes, search and pagination are exercised.

CI runs integration separately on Node 24. No production service/repository method is mocked; local HTTP peers supply deterministic contracts for external dependencies. These suites do not assert real LLM answer quality or live audio.

Set `TEST_MONGO_URI` to a dedicated MongoDB 8 instance, e.g. `mongodb://127.0.0.1:27017`. A new UUID-named database is created and dropped per run. A missing URL fails the suite explicitly.
