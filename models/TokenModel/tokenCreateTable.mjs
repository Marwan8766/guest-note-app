import pool from '../../database.mjs';

async function createTable() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        expiresAt BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;

    await pool.query(createTableQuery);

    console.log('Table tokens created successfully');
  } catch (error) {
    console.error('Error creating table:', error);
  }
}

createTable();
