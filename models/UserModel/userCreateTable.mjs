import pool from '../../database.mjs';

async function createTable() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        profilePicture VARCHAR(255),
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        passwordChangedAt DATETIME,
        emailConfirmOtp VARCHAR(255),
        emailConfirmOtpExpires BIGINT,
        emailConfirmed BOOLEAN DEFAULT false,
        notifications BOOLEAN DEFAULT false,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP
      )
    `;

    await pool.query(createTableQuery);

    // Create an index on the email column
    const createIndexQuery = `
    CREATE INDEX email_index ON users(email);
      `;
    await pool.query(createIndexQuery);

    console.log('Table users created successfully');
  } catch (error) {
    console.error('Error creating table:', error);
  }
}

createTable();
