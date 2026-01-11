/**
 * Database schema creation for form0 SQLite connector
 * Stores both main records and child records with relationships
 */

export async function createSchema(db, config) {
  const mainTableName = config.tableName;
  const childTableName = config.childTableName;

  const createMainTableQuery = `
    CREATE TABLE IF NOT EXISTS ${mainTableName} (
      _record_id TEXT PRIMARY KEY,
      _status TEXT,
      _version INTEGER NOT NULL DEFAULT 1,
      _draft INTEGER NOT NULL DEFAULT 0,
      _created_at TEXT,
      _updated_at TEXT,
      _created_at_client TEXT,
      _updated_at_client TEXT,
      _created_at_server TEXT,
      _updated_at_server TEXT,
      _created_by_id TEXT,
      _updated_by_id TEXT,
      _main_org_id TEXT,
      _sub_org_id TEXT,
      _project_id TEXT,
      _form_id TEXT,
      _changeset_id TEXT,
      _created_location TEXT,
      _updated_location TEXT,
      _latitude REAL,
      _longitude REAL,
      _altitude REAL,
      _horizontal_accuracy REAL,
      _vertical_accuracy REAL,
      _created_duration INTEGER,
      _updated_duration INTEGER,
      _updated_duration_cumulative INTEGER,
      form_values TEXT NOT NULL,
      created_at_db TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createChildTableQuery = `
    CREATE TABLE IF NOT EXISTS ${childTableName} (
      _child_record_id TEXT PRIMARY KEY,
      _record_id TEXT NOT NULL,
      _parent_record_id TEXT,
      _status TEXT,
      _version INTEGER NOT NULL DEFAULT 1,
      _draft INTEGER NOT NULL DEFAULT 0,
      _created_at TEXT,
      _updated_at TEXT,
      _created_at_client TEXT,
      _updated_at_client TEXT,
      _created_at_server TEXT,
      _updated_at_server TEXT,
      _created_by_id TEXT,
      _updated_by_id TEXT,
      _main_org_id TEXT,
      _sub_org_id TEXT,
      _project_id TEXT,
      _form_id TEXT,
      _changeset_id TEXT,
      _created_location TEXT,
      _updated_location TEXT,
      _latitude REAL,
      _longitude REAL,
      _altitude REAL,
      _horizontal_accuracy REAL,
      _vertical_accuracy REAL,
      _created_duration INTEGER,
      _updated_duration INTEGER,
      _updated_duration_cumulative INTEGER,
      _geometry TEXT,
      form_values TEXT NOT NULL,
      created_at_db TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (_record_id) REFERENCES ${mainTableName}(_record_id)
    )
  `;

  await db.exec(createMainTableQuery);
  await db.exec(createChildTableQuery);

  const indexQueries = [
    `CREATE INDEX IF NOT EXISTS idx_${mainTableName}_status ON ${mainTableName} (_status)`,
    `CREATE INDEX IF NOT EXISTS idx_${mainTableName}_form_id ON ${mainTableName} (_form_id)`,
    `CREATE INDEX IF NOT EXISTS idx_${mainTableName}_created_at ON ${mainTableName} (_created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_${mainTableName}_updated_at ON ${mainTableName} (_updated_at)`,
    `CREATE INDEX IF NOT EXISTS idx_${mainTableName}_draft ON ${mainTableName} (_draft)`,
    `CREATE INDEX IF NOT EXISTS idx_${mainTableName}_version ON ${mainTableName} (_version)`,
    `CREATE INDEX IF NOT EXISTS idx_${mainTableName}_changeset_id ON ${mainTableName} (_changeset_id)`,
    `CREATE INDEX IF NOT EXISTS idx_${childTableName}_record_id ON ${childTableName} (_record_id)`,
    `CREATE INDEX IF NOT EXISTS idx_${childTableName}_parent_record_id ON ${childTableName} (_parent_record_id)`,
    `CREATE INDEX IF NOT EXISTS idx_${childTableName}_status ON ${childTableName} (_status)`,
    `CREATE INDEX IF NOT EXISTS idx_${childTableName}_form_id ON ${childTableName} (_form_id)`,
    `CREATE INDEX IF NOT EXISTS idx_${childTableName}_created_at ON ${childTableName} (_created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_${childTableName}_updated_at ON ${childTableName} (_updated_at)`,
    `CREATE INDEX IF NOT EXISTS idx_${childTableName}_draft ON ${childTableName} (_draft)`,
    `CREATE INDEX IF NOT EXISTS idx_${childTableName}_version ON ${childTableName} (_version)`,
    `CREATE INDEX IF NOT EXISTS idx_${childTableName}_changeset_id ON ${childTableName} (_changeset_id)`,
  ];

  for (const query of indexQueries) {
    await db.exec(query);
  }
}
