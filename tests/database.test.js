import test from 'node:test';
import assert from 'node:assert/strict';

import { SQLiteDatabase } from '../src/database.js';

const config = {
  databasePath: ':memory:',
  tableName: 'submissions',
  childTableName: 'submission_children',
  debug: false,
};

test('database wrapper preserves the asynchronous query interface', async () => {
  const db = new SQLiteDatabase(config);

  await db.connect();
  await db.exec('CREATE TABLE examples (id INTEGER PRIMARY KEY, value TEXT, optional TEXT)');

  const insert = await db.run('INSERT INTO examples (value, optional) VALUES (?, ?)', [
    'first',
    undefined,
  ]);
  assert.equal(insert.changes, 1);

  const row = await db.get('SELECT value, optional FROM examples WHERE id = ?', [1]);
  assert.deepEqual(row, { value: 'first', optional: null });

  await db.run('INSERT INTO examples (value) VALUES (?)', ['second']);
  const rows = await db.all('SELECT value FROM examples ORDER BY id');
  assert.deepEqual(rows, [{ value: 'first' }, { value: 'second' }]);
  assert.equal(await db.healthCheck(), true);

  await db.disconnect();
  await assert.rejects(db.get('SELECT 1'), /Database not connected/);
});
