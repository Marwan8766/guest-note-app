import pool from '../../database.mjs';

async function createTable() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS media (
        id INT AUTO_INCREMENT PRIMARY KEY,
        note_id INT NOT NULL,
        media_url VARCHAR(255) NOT NULL,
        FOREIGN KEY (note_id) REFERENCES notes(id)
      )
    `;

    await pool.query(createTableQuery);

    console.log('Table media created successfully');
  } catch (error) {
    console.error('Error creating table:', error);
  }
}

createTable();
