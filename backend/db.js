const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'study_room_app',
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false // Aiven requires SSL. Set to false if you don't have the ca.pem downloaded yet.
  } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
