const db = require('./db');

async function migrate() {
  try {
    console.log('Running Messages migration...');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS Messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          room_id INT NOT NULL,
          user_id INT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (room_id) REFERENCES Rooms(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
    console.log('Messages table created.');
    
    console.log('Migrations complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
