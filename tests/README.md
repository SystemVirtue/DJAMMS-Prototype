DB-backed Playwright tests
==========================

These tests can run in two modes:

- LocalStorage fallback (default): fast and reliable for local dev. No external credentials needed.
- DB-backed (strict integration): creates a `queues` document in Appwrite before the test and deletes it after. Use this when you want the test to validate the real Appwrite DB path.

Environment variables for DB-backed mode
--------------------------------------

Set the following environment variables (examples are also supported with `VITE_` prefixes):

- APPWRITE_ENDPOINT or VITE_APPWRITE_ENDPOINT — Appwrite API endpoint (e.g. https://syd.cloud.appwrite.io/v1)
- APPWRITE_PROJECT_ID or VITE_APPWRITE_PROJECT_ID — Appwrite project id
- APPWRITE_DATABASE_ID or VITE_APPWRITE_DATABASE_ID — Appwrite database id
- APPWRITE_API_KEY or VITE_APPWRITE_API_KEY — Appwrite API key (service key with write privileges)

Usage
-----

1. To run tests with localStorage fallback (no env vars required):

```bash
npx playwright test --project=chromium --reporter=list
```

2. To run tests using DB-backed setup (ensure env vars above are set):

```bash
export APPWRITE_ENDPOINT="https://syd.cloud.appwrite.io/v1"
export APPWRITE_PROJECT_ID="<project-id>"
export APPWRITE_DATABASE_ID="<database-id>"
export APPWRITE_API_KEY="<service-key>"

npx playwright test --project=chromium --reporter=list
```

The test will create or update a `queues` document for `venue1` and delete it on test cleanup.
