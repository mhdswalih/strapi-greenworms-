'use strict';

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set in environment');
  process.exit(1);
}

const EXPORT_FILE = path.join(__dirname, '..', 'data', 'sqlite-export.json');

const TABLE_INSERT_ORDER = [
  'i18n_locale',

  'admin_roles',
  'admin_users',
  'admin_users_roles_lnk',
  'admin_permissions',
  'admin_permissions_role_lnk',

  'up_roles',
  'up_permissions',
  'up_permissions_role_lnk',
  'up_users',
  'up_users_role_lnk',

  'upload_folders',
  'upload_folders_parent_lnk',

  'files',
  'files_folder_lnk',

  'components_shared_rich_texts',
  'components_shared_quotes',
  'components_shared_media',
  'components_shared_seos',
  'components_shared_sliders',
  'components_blocks_heroes',
  'components_sections_feature_items',
  'components_sections_testimonial_items',

  'categories',
  'authors',

  'abouts',
  'abouts_cmps',

  'articles',
  'articles_cmps',
  'articles_author_lnk',
  'articles_category_lnk',

  'globals',
  'globals_cmps',

  'heroes',
  'heroes_cmps',

  'headers',

  'cta_sections',

  'video_sections',

  'testimonials_sections',
  'testimonials_sections_cmps',

  'stories',
  'stories_cmps',

  'official_partners',

  'feature_sections',

  'files_related_mph',

  'strapi_core_store_settings',
  'strapi_database_schema',
  'strapi_migrations_internal',

  'strapi_api_tokens',
  'strapi_api_token_permissions',
  'strapi_api_token_permissions_token_lnk',

  'strapi_transfer_tokens',
  'strapi_transfer_token_permissions',
  'strapi_transfer_token_permissions_token_lnk',

  'strapi_webhooks',

  'strapi_audit_logs',
  'strapi_audit_logs_user_lnk',

  'strapi_history_versions',

  'strapi_sessions',

  'strapi_workflows',
  'strapi_workflows_stages',
  'strapi_workflows_stages_workflow_lnk',
  'strapi_workflows_stages_permissions_lnk',
  'strapi_workflows_stage_required_to_publish_lnk',

  'strapi_releases',
  'strapi_release_actions',
  'strapi_release_actions_release_lnk',

  'strapi_ai_localization_jobs',
  'strapi_ai_metadata_jobs',
];

const SKIP_TABLES = new Set(['strapi_sessions']);

const BOOLEAN_COLUMNS = {
  admin_users: ['is_active', 'blocked'],
  strapi_webhooks: ['enabled'],
  strapi_release_actions: ['is_entry_valid'],
  up_users: ['confirmed', 'blocked'],
};

const JSON_COLUMNS = new Set([
  'action_parameters', 'properties', 'conditions', 'payload',
  'content_types', 'events', 'headers', 'formats', 'focal_point',
  'provider_metadata', 'target_locales', 'schema', 'data',
]);

const TIMESTAMP_SUFFIXES = ['_at'];
const TIMESTAMP_EXACT = new Set(['time', 'date']);

function isTimestampColumn(col) {
  if (TIMESTAMP_EXACT.has(col)) return true;
  return TIMESTAMP_SUFFIXES.some(s => col.endsWith(s));
}

function convertTimestamp(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && value > 1000000000000) {
    return new Date(value).toISOString();
  }
  return value;
}

function sanitizeRow(table, row) {
  const clean = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined || value === null) {
      clean[key] = null;
      continue;
    }

    if (BOOLEAN_COLUMNS[table] && BOOLEAN_COLUMNS[table].includes(key)) {
      clean[key] = typeof value === 'number' ? value === 1 : !!value;
      continue;
    }

    if (JSON_COLUMNS.has(key) && typeof value === 'string') {
      try {
        clean[key] = JSON.parse(value);
      } catch {
        clean[key] = value;
      }
      continue;
    }

    if (isTimestampColumn(key)) {
      clean[key] = convertTimestamp(value);
      continue;
    }

    clean[key] = value;
  }
  return clean;
}

async function migrateTable(client, table, rows, idMap) {
  if (!rows || rows.length === 0) {
    console.log(`  SKIP ${table} (no data)`);
    return;
  }

  const sampleRow = sanitizeRow(table, rows[0]);
  const columns = Object.keys(sampleRow);

  const colList = columns.map(c => `"${c}"`).join(', ');
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

  const sql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`;

  let inserted = 0;
  let skipped = 0;

  for (const rawRow of rows) {
    const row = sanitizeRow(table, rawRow);
    const values = columns.map(col => {
      const val = row[col];
      if (val === undefined) return null;
      return val;
    });

    try {
      await client.query(sql, values);
      inserted++;
    } catch (err) {
      if (err.code === '23505') {
        skipped++;
      } else {
        console.error(`  ERROR inserting into ${table}:`, err.message);
        console.error(`  Row:`, JSON.stringify(row).substring(0, 200));
        if (process.env.STRICT === '1') {
          throw err;
        }
      }
    }
  }

  console.log(`  OK   ${table}: ${inserted} inserted, ${skipped} skipped (duplicates)`);
}

async function resetSequences(client) {
  console.log('\nResetting auto-increment sequences...');

  const tables = await client.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_default LIKE 'nextval%'
  `);

  for (const { table_name, column_name } of tables.rows) {
    try {
      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('"${table_name}"', '${column_name}'),
          COALESCE((SELECT MAX("${column_name}") FROM "${table_name}"), 1)
        )
      `);
    } catch (err) {
      console.log(`  WARN: Could not reset sequence for ${table_name}.${column_name}: ${err.message}`);
    }
  }
  console.log('  Sequences reset.');
}

async function main() {
  console.log('Loading exported SQLite data...');
  const allData = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));

  console.log('Connecting to Postgres...');
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('Connected.');

  const existingTables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  const tableSet = new Set(existingTables.rows.map(r => r.table_name));

  console.log('\nClearing all tables...');
  const reversedOrder = [...TABLE_INSERT_ORDER].reverse().filter(t => !SKIP_TABLES.has(t));
  for (const table of reversedOrder) {
    if (tableSet.has(table)) {
      try {
        await client.query(`DELETE FROM "${table}"`);
      } catch {}
    }
  }
  console.log('Tables cleared.\n');

  for (const table of TABLE_INSERT_ORDER) {
    if (SKIP_TABLES.has(table)) {
      console.log(`  SKIP ${table} (ephemeral data)`);
      continue;
    }
    if (!tableSet.has(table)) {
      console.log(`  SKIP ${table} (table does not exist in Postgres yet)`);
      continue;
    }
    const rows = allData[table] || [];
    await migrateTable(client, table, rows, {});
  }

  await resetSequences(client);

  await client.end();
  console.log('\nMigration complete!');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
