const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const dbPath = process.env.LOCAL_DB_PATH || path.resolve(process.cwd(), 'local.db');

(async () => {
  try {
    const SQL = await initSqlJs();
    let db;
    if (fs.existsSync(dbPath)) {
        const filebuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(filebuffer);
        console.log('Opened existing DB.');
    } else {
        db = new SQL.Database();
        console.log('Created new in-memory DB.');
    }

    db.exec(`
      create table if not exists members (
        user_id text primary key,
        owner_id text,
        display_name text,
        regular_name text,
        government_name text,
        company text,
        key_ref text,
        base_url text,
        notes text,
        created_at text,
        updated_at text
      );

      create table if not exists memories (
        id text primary key,
        owner_id text,
        user_id text,
        content text,
        tags text,
        metadata text,
        created_at text,
        updated_at text
      );

      create table if not exists memory_sources (
        id text primary key,
        memory_id text,
        owner_id text,
        source_type text,
        source_ref text,
        tool text,
        confidence real,
        metadata text,
        created_at text,
        updated_at text
      );

      create table if not exists memory_revisions (
        id text primary key,
        memory_id text,
        owner_id text,
        previous_content text,
        new_content text,
        reason text,
        created_at text,
        updated_at text
      );

      create table if not exists memory_votes (
        id text primary key,
        memory_id text,
        owner_id text,
        vote integer,
        created_at text,
        updated_at text,
        unique (memory_id, owner_id)
      );

      create table if not exists tasks (
        id text primary key,
        title text,
        description text,
        source_message text,
        status text,
        priority text,
        complexity text,
        created_by text,
        assigned_to text,
        assigned_at text,
        started_at text,
        completed_at text,
        result text,
        parent_task_id text,
        dependencies text,
        locked_files text,
        error_message text,
        created_at text,
        updated_at text
      );

      create table if not exists agents (
        id text primary key,
        name text,
        status text,
        current_task_id text,
        last_heartbeat text,
        created_at text,
        updated_at text
      );
    `);

    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    console.log('Local DB initialized and saved to: ' + dbPath);

  } catch (err) {
    console.error('Failed to init DB:', err);
    process.exit(1);
  }
})();
