import pool from '../../database.mjs';

async function createTable() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        type INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message VARCHAR(255) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (receiver_id) REFERENCES users(id),
        FOREIGN KEY (type) REFERENCES note_type(id) 
      )
    `;

    await pool.query(createTableQuery);

    console.log('Table notes created successfully');
  } catch (error) {
    console.error('Error creating table:', error);
  }
}

createTable();
