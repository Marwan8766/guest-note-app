import pool from '../../database.mjs';

async function createTable() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS note_type (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        disabled BOOLEAN NOT NULL
      )
    `;

    await pool.query(createTableQuery);

    console.log('Table note_type created successfully');
  } catch (error) {
    console.error('Error creating table:', error);
  }
}

createTable();

async function insertNoteTypes() {
  try {
    const insertQuery = `
      INSERT INTO note_type (name, disabled)
      VALUES
        ('Congrats', false),
        ('Invitations', false),
        ('Reminders', false)
    `;

    await pool.query(insertQuery);

    console.log('Initial note types inserted successfully');
  } catch (error) {
    console.error('Error inserting note types:', error);
  }
}

insertNoteTypes();
