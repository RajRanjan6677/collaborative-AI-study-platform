const db = require('./db');

async function migrate() {
  try {
    console.log('Running Peer Review migration...');

    await db.execute('DROP TABLE IF EXISTS Reviews');
    await db.execute('DROP TABLE IF EXISTS Submissions');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS Submissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          room_id INT NOT NULL,
          user_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          content_url TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'link',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (room_id) REFERENCES Rooms(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
    console.log('Submissions table created.');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS Reviews (
          id INT AUTO_INCREMENT PRIMARY KEY,
          submission_id INT NOT NULL,
          reviewer_id INT NOT NULL,
          rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comments TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (submission_id) REFERENCES Submissions(id) ON DELETE CASCADE,
          FOREIGN KEY (reviewer_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
    console.log('Reviews table created.');
    
    console.log('Migrations complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
