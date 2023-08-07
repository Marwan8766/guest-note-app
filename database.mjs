import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config({ path: './config.env' });

const pool = mysql
  .createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })
  .promise();

// Checking if the database connection is successful
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Database connected...');
  }
});

export default pool;
