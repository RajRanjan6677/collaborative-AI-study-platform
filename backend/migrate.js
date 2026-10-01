const db = require('./db');

async function migrate() {
  try {
    console.log('Running migrations...');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS Contacts (
          user_id INT NOT NULL,
          contact_id INT NOT NULL,
          status ENUM('pending', 'accepted') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, contact_id),
          FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
          FOREIGN KEY (contact_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
    console.log('Contacts table created.');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS Notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          type VARCHAR(50) NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);
    console.log('Notifications table created.');

    // We can also make invite_token nullable if we want, but it's fine for now since we just won't use it in UI.
    
    console.log('Migrations complete.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
