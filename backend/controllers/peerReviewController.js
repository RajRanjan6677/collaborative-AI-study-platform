const db = require('../db');

// Helper to check membership
const verifyMembership = async (roomId, userId) => {
  const [members] = await db.execute('SELECT * FROM RoomMembers WHERE room_id = ? AND user_id = ?', [roomId, userId]);
  return members.length > 0;
};

// Helper for generating anonymous aliases
// Gives a deterministic "Student X" alias based on when they joined the room.
const getAlias = async (roomId, targetUserId) => {
  const [members] = await db.execute('SELECT user_id FROM RoomMembers WHERE room_id = ? ORDER BY joined_at ASC', [roomId]);
  const index = members.findIndex(m => m.user_id === targetUserId);
  return `Student ${index + 1}`;
};

exports.getSubmissions = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    if (!(await verifyMembership(roomId, userId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [submissions] = await db.execute(
      'SELECT id, user_id, title, content_url, type, created_at FROM Submissions WHERE room_id = ? ORDER BY created_at DESC', 
      [roomId]
    );

    // Map through and assign aliases unless the requester is the submitter
    const maskedSubmissions = await Promise.all(submissions.map(async (sub) => {
      const isMine = sub.user_id === userId;
      return {
        ...sub,
        author: isMine ? 'You' : await getAlias(roomId, sub.user_id),
        // Don't send user_id to frontend if it's not theirs to maintain anonymity
        user_id: isMine ? sub.user_id : null 
      };
    }));

    res.json(maskedSubmissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching submissions' });
  }
};

exports.createSubmission = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { title, type = 'link' } = req.body;
    let { content_url } = req.body;
    const userId = req.user.userId;

    if (!(await verifyMembership(roomId, userId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.file) {
      content_url = `http://localhost:5000/uploads/${req.file.filename}`;
    }

    if (!content_url) {
      return res.status(400).json({ message: 'Content URL or File is required' });
    }

    const [result] = await db.execute(
      'INSERT INTO Submissions (room_id, user_id, title, content_url, type) VALUES (?, ?, ?, ?, ?)',
      [roomId, userId, title, content_url, type]
    );

    res.status(201).json({ message: 'Submission created', submissionId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating submission' });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const { roomId, submissionId } = req.params;
    const userId = req.user.userId;

    if (!(await verifyMembership(roomId, userId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [reviews] = await db.execute(
      'SELECT id, reviewer_id, rating, comments, created_at FROM Reviews WHERE submission_id = ? ORDER BY created_at DESC',
      [submissionId]
    );

    const maskedReviews = await Promise.all(reviews.map(async (rev) => {
      const isMine = rev.reviewer_id === userId;
      return {
        ...rev,
        reviewer: isMine ? 'You' : await getAlias(roomId, rev.reviewer_id),
        reviewer_id: isMine ? rev.reviewer_id : null
      };
    }));

    res.json(maskedReviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching reviews' });
  }
};

exports.submitReview = async (req, res) => {
  try {
    const { roomId, submissionId } = req.params;
    const { rating, comments } = req.body;
    const userId = req.user.userId;

    if (!(await verifyMembership(roomId, userId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Prevent self-review
    const [subCheck] = await db.execute('SELECT user_id FROM Submissions WHERE id = ?', [submissionId]);
    if (subCheck.length > 0 && subCheck[0].user_id === userId) {
      return res.status(400).json({ message: 'You cannot review your own submission' });
    }

    await db.execute(
      'INSERT INTO Reviews (submission_id, reviewer_id, rating, comments) VALUES (?, ?, ?, ?)',
      [submissionId, userId, rating, comments]
    );

    res.status(201).json({ message: 'Review submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error submitting review' });
  }
};
