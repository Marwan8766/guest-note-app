import pool from '../../database.mjs';

async function createTable() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS blacklist_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(255) NOT NULL,
        expiresAt BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await pool.query(createTableQuery);

    // Create an index on the token column
    const createIndexQuery = `
    CREATE INDEX token_index ON blacklist_tokens(token);
      `;
    await pool.query(createIndexQuery);

    console.log('Table blacklist_tokens created successfully');
  } catch (error) {
    console.error('Error creating table:', error);
  }
}

createTable();
