# form0-connector-sqlite

[![NPM Version](https://img.shields.io/npm/v/form0-connector-sqlite)](https://www.npmjs.com/package/form0-connector-sqlite)
[![NPM Downloads](https://img.shields.io/npm/dm/form0-connector-sqlite)](https://www.npmjs.com/package/form0-connector-sqlite)
[![CI](https://github.com/paqu-io/form0-connector-sqlite/actions/workflows/ci.yml/badge.svg)](https://github.com/paqu-io/form0-connector-sqlite/actions/workflows/ci.yml)
![NPM License](https://img.shields.io/npm/l/form0-connector-sqlite)
[![Docs](https://img.shields.io/badge/docs-docs.form0.dev-2563eb)](https://docs.form0.dev)
[![Website](https://img.shields.io/badge/site-form0.dev-0f172a)](https://form0.dev)
![NPM Last Update](https://img.shields.io/npm/last-update/form0-connector-sqlite)
[![Socket](https://socket.dev/api/badge/npm/package/form0-connector-sqlite)](https://socket.dev/npm/package/form0-connector-sqlite)

> [!NOTE]
> form0 is in active development and is available to use today. Its schema format and core
> concepts are stable in practice, but releases before 1.0 may include breaking changes. Pin your
> versions and review the release notes when upgrading. A formally stable release is coming.

`form0-connector-sqlite` stores form0 structured records in a local SQLite database. It keeps the
complete form payload while projecting common metadata into dedicated columns and preserving
parent-child relationships for repeatable sections.

## 🚀 Start with the CLI

The recommended integration path is [`form0-cli`](https://github.com/paqu-io/form0-cli). From the
interactive CLI, install and configure the connector:

```text
form0> connector install form0-connector-sqlite
form0> connector configure form0-connector-sqlite
form0> connector test form0-connector-sqlite
```

Follow the [form0 quickstart](https://docs.form0.dev/getting-started/quickstart) first if you do not
already have a project.

The connector is for Node.js projects. React Native applications should use platform-native
storage such as `expo-sqlite`; `form0-cli` intentionally blocks connector installation in React
Native and Expo projects.

## 📦 Direct installation

```bash
npm install form0-connector-sqlite
```

Copy the variables you need from `.env.example` into a local `.env.local` file:

```dotenv
FORM0_CONNECTOR_SQLITE_PATH=./form0.db
FORM0_CONNECTOR_SQLITE_TABLE_NAME=form0_submissions
FORM0_CONNECTOR_SQLITE_CHILD_TABLE_NAME=form0_submissions_children
```

Do not commit local database files when they contain real submissions.

The connector can also be initialized directly:

```javascript
import { Form0SQLiteConnector } from 'form0-connector-sqlite';

const connector = new Form0SQLiteConnector();

await connector.initialize();
console.log(await connector.healthCheck());

// Pass canonical structured records to connector.onFormSubmit(record).

await connector.destroy();
```

`initialize(config, envVars)` accepts explicit configuration overrides when environment variables
are not appropriate for the host application.

## Storage behavior

- The database file and configured tables are created when the connector initializes.
- Main submissions and nested repeatable-section records retain their relationships.
- Canonical structured records are accepted through `onFormSubmit()`.
- Server timestamps are added when records are stored.
- Retryable file-lock and I/O failures are retried once after reconnecting.
- `healthCheck()` reports connection health, and `destroy()` closes the database.

The host application remains responsible for file permissions, backups, retention, and safe
handling of exported database files.

## ✅ Requirements

- Node.js 22 or newer
- Write access to the configured database directory
- A platform supported by the `better-sqlite3` native dependency

## 📚 Documentation

- [Connectors overview](https://docs.form0.dev/connectors/overview)
- [SQLite setup and configuration](https://docs.form0.dev/connectors/sqlite/setup)
- [SQLite storage model and operations](https://docs.form0.dev/connectors/sqlite/storage)
- [Direct integration](https://docs.form0.dev/connectors/direct-integration)
- [CLI connector management](https://docs.form0.dev/cli/connector-management)

## 🔒 Security

Report vulnerabilities according to [SECURITY.md](./SECURITY.md). Protect the database file as
sensitive application data and do not place it in a publicly served directory.

## 🤝 Support and contributing

See [SUPPORT.md](https://github.com/paqu-io/form0-connector-sqlite/blob/main/SUPPORT.md) for help and
[CONTRIBUTING.md](https://github.com/paqu-io/form0-connector-sqlite/blob/main/CONTRIBUTING.md) to contribute.

## 📄 License

[MIT](./LICENSE)
