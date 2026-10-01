const db = require('./db');

async function migrate() {
  try {
    console.log('Running Tasks and Resources migration...');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS Tasks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          room_id INT NOT NULL,
          creator_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          status ENUM('todo', 'in_progress', 'done') DEFAULT 'todo',
          due_date DATETIME,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (room_id) REFERENCES Rooms(id) ON DELETE CASCADE,
          FOREIGN KEY (creator_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tasks table created.');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS Resources (
          id INT AUTO_INCREMENT PRIMARY KEY,
          room_id INT NOT NULL,
          uploader_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          url TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'link',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (room_id) REFERENCES Rooms(id) ON DELETE CASCADE,
          FOREIGN KEY (uploader_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
    console.log('Resources table created.');
    
    console.log('Migrations complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
