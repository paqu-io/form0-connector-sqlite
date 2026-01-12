/**
 * SQLite Connector for form0
 * Implements the standard form0 connector interface
 * Supports both main records and child records with proper relationships
 */

import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import { recordVersion } from 'form0-core';
import { SQLiteDatabase } from './database.js';
import { createSchema } from './schema.js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DEFAULT_DB_NAME = 'form0.db';
const DEFAULT_MAIN_TABLE = 'form0_submissions';
const DEFAULT_CHILD_TABLE = 'form0_submissions_children';

const RETRYABLE_SQLITE_CODES = new Set([
  'SQLITE_IOERR',
  'SQLITE_BUSY',
  'SQLITE_LOCKED',
  'SQLITE_CANTOPEN',
]);

function isRetryableSQLiteError(error) {
  if (!error) {
    return false;
  }
  if (error.code && RETRYABLE_SQLITE_CODES.has(error.code)) {
    return true;
  }
  if (typeof error.message === 'string') {
    return Array.from(RETRYABLE_SQLITE_CODES).some((code) => error.message.includes(code));
  }
  return false;
}

function getLockHint(error) {
  if (!error) {
    return '';
  }
  if (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED') {
    return '- Database file is locked by another process (e.g., DBeaver). Disconnect and retry.';
  }
  if (error.code === 'SQLITE_IOERR' || error.code === 'SQLITE_CANTOPEN') {
    return '- Database file may be locked or unavailable. Close other viewers and retry.';
  }
  return '';
}

function sanitizeIdentifier(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  return /^[A-Za-z0-9_]+$/.test(trimmed) ? trimmed : fallback;
}

export class Form0SQLiteConnector {
  constructor() {
    this.db = null;
    this.config = {};
    this.isInitialized = false;
  }

  async reconnect() {
    try {
      if (this.db) {
        await this.db.disconnect();
      }
    } catch (error) {
      // Ignore disconnect errors; we'll try to reopen.
    }

    this.db = new SQLiteDatabase(this.config);
    await this.db.connect();
    await createSchema(this.db, this.config);
  }

  /**
   * Initialize the connector with configuration
   */
  async initialize(config = {}, envVars = {}) {
    try {
      const env = { ...process.env, ...envVars };

      const mergedConfig = { ...config };
      const dbPath =
        mergedConfig.databasePath || env.FORM0_CONNECTOR_SQLITE_PATH || DEFAULT_DB_NAME;

      this.config = {
        ...mergedConfig,
        databasePath: path.isAbsolute(dbPath)
          ? dbPath
          : path.resolve(process.cwd(), dbPath),
        tableName: sanitizeIdentifier(
          mergedConfig.tableName || env.FORM0_CONNECTOR_SQLITE_TABLE_NAME,
          DEFAULT_MAIN_TABLE
        ),
        childTableName: sanitizeIdentifier(
          mergedConfig.childTableName || env.FORM0_CONNECTOR_SQLITE_CHILD_TABLE_NAME,
          DEFAULT_CHILD_TABLE
        ),
        debug:
          typeof mergedConfig.debug === 'boolean'
            ? mergedConfig.debug
            : env.FORM0_CONNECTOR_SQLITE_DEBUG === 'true',
      };

      const dbDir = path.dirname(this.config.databasePath);
      await fs.mkdir(dbDir, { recursive: true });

      this.db = new SQLiteDatabase(this.config);
      await this.db.connect();
      await createSchema(this.db, this.config);

      this.isInitialized = true;

      if (this.config.debug) {
        console.log('[form0-connector-sqlite] Initialized successfully');
        console.log(`[form0-connector-sqlite] Database path: ${this.config.databasePath}`);
      }
    } catch (error) {
      const hint = getLockHint(error);
      const message = hint ? `${error.message} ${hint}` : error.message;
      throw new Error(`Failed to initialize SQLite connector: ${message}`);
    }
  }

  /**
   * Handle form submission - called by form0-cli when a form is submitted
   */
  async onFormSubmit(structuredRecord, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Connector not initialized. Call initialize() first.');
    }

    try {
      if (structuredRecord.version && !recordVersion.isValid(structuredRecord.version)) {
        console.warn(`[form0-connector-sqlite] Invalid record version: ${structuredRecord.version}`);
      }

      const serverTimestamp = new Date().toISOString();
      const recordWithServerTimestamps = {
        ...structuredRecord,
        updated_at: serverTimestamp,
        updated_at_server: serverTimestamp,
        created_at_server: structuredRecord.created_at_server || serverTimestamp,
      };

      const mainResult = await this.db.insertRecord(recordWithServerTimestamps);

      const processedChildRecords = [];

      const processRepeatableSections = async (
        formValues,
        mainRecordId,
        parentRecordId,
        sectionPath = ''
      ) => {
        if (!formValues || typeof formValues !== 'object') {
          return [];
        }

        const results = [];

        for (const [key, value] of Object.entries(formValues)) {
          if (!Array.isArray(value) || value.length === 0 || !value[0]?.id) {
            continue;
          }

          const currentSectionPath = sectionPath ? `${sectionPath}.${key}` : key;

          if (this.config.debug) {
            console.log(
              `[form0-connector-sqlite] Processing RepeatableSection "${currentSectionPath}" with ${value.length} child records`
            );
          }

          for (let i = 0; i < value.length; i += 1) {
            const childRecord = value[i];

            const childTimestamp = new Date().toISOString();
            const childWithServerTimestamps = {
              ...childRecord,
              updated_at: childTimestamp,
              updated_at_server: childRecord.updated_at_server || serverTimestamp,
              created_at_server: childRecord.created_at_server || serverTimestamp,
            };

            const childResult = await this.db.insertRecord(childWithServerTimestamps, {
              isChildRecord: true,
              mainRecordId,
              parentRecordId,
            });

            results.push({
              sectionKey: currentSectionPath,
              childIndex: i,
              childRecordId: childResult.childRecordId,
              parentRecordId,
            });

            if (childWithServerTimestamps.form_values) {
              const nestedResults = await processRepeatableSections(
                childWithServerTimestamps.form_values,
                mainRecordId,
                childResult.childRecordId,
                currentSectionPath
              );
              results.push(...nestedResults);
            }
          }
        }

        return results;
      };

      const childResults = await processRepeatableSections(
        recordWithServerTimestamps.form_values,
        mainResult.recordId,
        mainResult.recordId
      );

      processedChildRecords.push(...childResults);

      return {
        success: true,
        recordId: mainResult.recordId,
        childRecords: processedChildRecords,
        message: `Record stored successfully in SQLite (main + ${childResults.length} child records)`,
        timestamp: serverTimestamp,
        serverTimestamps: {
          created_at_server: recordWithServerTimestamps.created_at_server,
          updated_at_server: serverTimestamp,
        },
      };
    } catch (error) {
      const hint = getLockHint(error);
      const message = hint ? `${error.message} ${hint}` : error.message;

      if (!options.retry && isRetryableSQLiteError(error)) {
        if (this.config.debug) {
          console.warn('[form0-connector-sqlite] Retrying after SQLite error:', message);
        }

        try {
          await this.reconnect();
          return await this.onFormSubmit(structuredRecord, { retry: true });
        } catch (retryError) {
          const retryHint = getLockHint(retryError);
          const retryMessage = retryHint ? `${retryError.message} ${retryHint}` : retryError.message;
          console.error('[form0-connector-sqlite] Retry failed:', retryMessage);
          return {
            success: false,
            error: retryMessage,
            timestamp: new Date().toISOString(),
          };
        }
      }

      console.error('[form0-connector-sqlite] Failed to store record:', message);
      return {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check if the connector is healthy and can connect to the database
   */
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return {
          healthy: false,
          message: 'Connector not initialized',
        };
      }

      const isConnected = await this.db.healthCheck();

      return {
        healthy: isConnected,
        message: isConnected ? 'SQLite connection healthy' : 'SQLite connection failed',
        database: this.config.databasePath,
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Health check failed: ${error.message}`,
      };
    }
  }

  /**
   * Get connector metadata
   */
  getMetadata() {
    return {
      type: 'sqlite',
      database: this.config.databasePath,
      databasePath: this.config.databasePath,
      tableName: this.config.tableName,
      childTableName: this.config.childTableName,
    };
  }

  /**
   * Clean up resources
   */
  async destroy() {
    if (this.db) {
      await this.db.disconnect();
      this.db = null;
    }
    this.isInitialized = false;
  }
}

export default Form0SQLiteConnector;
