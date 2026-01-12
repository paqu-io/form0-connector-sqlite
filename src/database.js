/**
 * SQLite database operations for form0 connector
 * Supports both main records and child records with proper relationships
 */

import sqlite3 from 'sqlite3';

export class SQLiteDatabase {
  constructor(config) {
    this.config = config;
    this.db = null;
  }

  /**
   * Connect to SQLite database
   */
  async connect() {
    if (this.db) {
      return;
    }

    const filename = this.config.databasePath;

    await new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(filename, (err) => {
        if (err) {
          reject(new Error(`Failed to open SQLite database: ${err.message}`));
          return;
        }

        this.db.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
          if (pragmaErr) {
            reject(new Error(`Failed to enable foreign keys: ${pragmaErr.message}`));
            return;
          }
          resolve();
        });
      });
    });

    if (this.config.debug) {
      console.log('[form0-connector-sqlite] Database connected successfully');
    }
  }

  /**
   * Disconnect from SQLite database
   */
  async disconnect() {
    if (!this.db) {
      return;
    }

    await new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(new Error(`Failed to close SQLite database: ${err.message}`));
          return;
        }
        resolve();
      });
    });

    this.db = null;

    if (this.config.debug) {
      console.log('[form0-connector-sqlite] Database disconnected');
    }
  }

  /**
   * Execute a SQL statement
   */
  async run(query, params = []) {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return await new Promise((resolve, reject) => {
      this.db.run(query, params, function runCallback(err) {
        if (err) {
          const error = new Error(err.message);
          error.code = err.code;
          error.errno = err.errno;
          reject(error);
          return;
        }
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  /**
   * Execute a SQL query and return a single row
   */
  async get(query, params = []) {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return await new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) {
          const error = new Error(err.message);
          error.code = err.code;
          error.errno = err.errno;
          reject(error);
          return;
        }
        resolve(row);
      });
    });
  }

  /**
   * Execute a SQL query and return all rows
   */
  async all(query, params = []) {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return await new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          const error = new Error(err.message);
          error.code = err.code;
          error.errno = err.errno;
          reject(error);
          return;
        }
        resolve(rows);
      });
    });
  }

  /**
   * Execute a SQL script
   */
  async exec(query) {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return await new Promise((resolve, reject) => {
      this.db.exec(query, (err) => {
        if (err) {
          const error = new Error(err.message);
          error.code = err.code;
          error.errno = err.errno;
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * Check if database connection is healthy
   */
  async healthCheck() {
    try {
      if (!this.db) return false;

      const row = await this.get('SELECT 1 as health');
      return row?.health === 1;
    } catch (error) {
      console.error('[form0-connector-sqlite] Health check failed:', error.message);
      return false;
    }
  }

  /**
   * Insert a structured record into the database
   * Handles both main records and child records with proper relationships
   */
  async insertRecord(record, options = {}) {
    const mainTableName = this.config.tableName;
    const childTableName = this.config.childTableName;

    const isChildRecord = options.isChildRecord || false;
    const parentRecordId = options.parentRecordId || null;
    const mainRecordId = options.mainRecordId || record.id;

    if (isChildRecord) {
      const {
        id: childRecordId,
        status,
        version,
        draft,
        created_at,
        updated_at,
        created_at_client,
        updated_at_client,
        created_at_server,
        updated_at_server,
        created_by_id,
        updated_by_id,
        main_org_id,
        sub_org_id,
        project_id,
        form_id,
        changeset_id,
        created_location,
        updated_location,
        latitude,
        longitude,
        altitude,
        horizontal_accuracy,
        vertical_accuracy,
        created_duration,
        updated_duration,
        updated_duration_cumulative,
        geometry,
      } = record;

      const recordData = { ...record };

      const query = `
        INSERT INTO ${childTableName} (
          _child_record_id,
          _record_id,
          _parent_record_id,
          _status,
          _version,
          _draft,
          _created_at,
          _updated_at,
          _created_at_client,
          _updated_at_client,
          _created_at_server,
          _updated_at_server,
          _created_by_id,
          _updated_by_id,
          _main_org_id,
          _sub_org_id,
          _project_id,
          _form_id,
          _changeset_id,
          _created_location,
          _updated_location,
          _latitude,
          _longitude,
          _altitude,
          _horizontal_accuracy,
          _vertical_accuracy,
          _created_duration,
          _updated_duration,
          _updated_duration_cumulative,
          _geometry,
          form_values
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `;

      const values = [
        childRecordId,
        mainRecordId,
        parentRecordId,
        status,
        version,
        draft ? 1 : 0,
        created_at,
        updated_at,
        created_at_client,
        updated_at_client,
        created_at_server,
        updated_at_server,
        created_by_id,
        updated_by_id,
        main_org_id,
        sub_org_id,
        project_id,
        form_id,
        changeset_id,
        created_location,
        updated_location,
        latitude,
        longitude,
        altitude,
        horizontal_accuracy,
        vertical_accuracy,
        created_duration,
        updated_duration,
        updated_duration_cumulative,
        geometry ? JSON.stringify(geometry) : null,
        JSON.stringify(recordData),
      ];

      await this.run(query, values);

      if (this.config.debug) {
        console.log('[form0-connector-sqlite] Child record inserted:', childRecordId);
      }

      return {
        recordType: 'child',
        childRecordId: childRecordId,
      };
    }

    const {
      id: recordId,
      status,
      version,
      draft,
      created_at,
      updated_at,
      created_at_client,
      updated_at_client,
      created_at_server,
      updated_at_server,
      created_by_id,
      updated_by_id,
      main_org_id,
      sub_org_id,
      project_id,
      form_id,
      changeset_id,
      created_location,
      updated_location,
      latitude,
      longitude,
      altitude,
      horizontal_accuracy,
      vertical_accuracy,
      created_duration,
      updated_duration,
      updated_duration_cumulative,
    } = record;

    const recordData = { ...record };

    const query = `
      INSERT INTO ${mainTableName} (
        _record_id,
        _status,
        _version,
        _draft,
        _created_at,
        _updated_at,
        _created_at_client,
        _updated_at_client,
        _created_at_server,
        _updated_at_server,
        _created_by_id,
        _updated_by_id,
        _main_org_id,
        _sub_org_id,
        _project_id,
        _form_id,
        _changeset_id,
        _created_location,
        _updated_location,
        _latitude,
        _longitude,
        _altitude,
        _horizontal_accuracy,
        _vertical_accuracy,
        _created_duration,
        _updated_duration,
        _updated_duration_cumulative,
        form_values
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `;

    const values = [
      recordId,
      status,
      version,
      draft ? 1 : 0,
      created_at,
      updated_at,
      created_at_client,
      updated_at_client,
      created_at_server,
      updated_at_server,
      created_by_id,
      updated_by_id,
      main_org_id,
      sub_org_id,
      project_id,
      form_id,
      changeset_id,
      created_location,
      updated_location,
      latitude,
      longitude,
      altitude,
      horizontal_accuracy,
      vertical_accuracy,
      created_duration,
      updated_duration,
      updated_duration_cumulative,
      JSON.stringify(recordData),
    ];

    await this.run(query, values);

    if (this.config.debug) {
      console.log('[form0-connector-sqlite] Main record inserted:', recordId);
    }

    return {
      recordType: 'main',
      recordId: recordId,
    };
  }
}
