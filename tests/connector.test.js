import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { Form0SQLiteConnector } from '../src/index.js';

const require = createRequire(import.meta.url);
const { version: packageVersion } = require('../package.json');

test('metadata reports the installed package version', () => {
  const connector = new Form0SQLiteConnector();
  const metadata = connector.getMetadata();

  assert.equal(metadata.name, 'form0-connector-sqlite');
  assert.equal(metadata.version, packageVersion);
  assert.equal(metadata.type, 'sqlite');
});

test('initializes custom tables and stores main and nested records', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'form0-sqlite-test-'));
  const databasePath = path.join(directory, 'records.db');
  const connector = new Form0SQLiteConnector();

  t.after(async () => {
    await connector.destroy();
    await rm(directory, { recursive: true, force: true });
  });

  await connector.initialize({
    databasePath,
    tableName: 'submissions',
    childTableName: 'submission_children',
  });

  assert.deepEqual(await connector.healthCheck(), {
    healthy: true,
    message: 'SQLite connection healthy',
    database: databasePath,
  });

  const result = await connector.onFormSubmit({
    id: 'record-1',
    status: 'complete',
    version: 1,
    draft: false,
    form_values: {
      name: 'Ada',
      visits: [
        {
          id: 'visit-1',
          status: 'complete',
          version: 1,
          draft: false,
          form_values: { note: 'First visit' },
        },
      ],
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.recordId, 'record-1');
  assert.equal(result.childRecords.length, 1);

  const main = await connector.db.get('SELECT _record_id, form_values FROM submissions');
  const child = await connector.db.get(
    'SELECT _child_record_id, _record_id, form_values FROM submission_children'
  );

  assert.equal(main._record_id, 'record-1');
  assert.equal(JSON.parse(main.form_values).form_values.name, 'Ada');
  assert.deepEqual(child, {
    _child_record_id: 'visit-1',
    _record_id: 'record-1',
    form_values: child.form_values,
  });
  assert.equal(JSON.parse(child.form_values).form_values.note, 'First visit');

  assert.equal((await readFile(databasePath)).subarray(0, 16).toString(), 'SQLite format 3\u0000');
});
