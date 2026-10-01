const db = require('../db');

// Ollama Configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// Helper to check room membership
const verifyMembership = async (roomId, userId) => {
  const [members] = await db.execute('SELECT * FROM RoomMembers WHERE room_id = ? AND user_id = ?', [roomId, userId]);
  return members.length > 0;
};

// Helper to fetch recent chat context
const getRecentChatContext = async (roomId) => {
  const [messages] = await db.execute(`
    SELECT m.message as content, u.username
    FROM Messages m
    JOIN Users u ON m.user_id = u.id
    WHERE m.room_id = ?
    ORDER BY m.created_at DESC
    LIMIT 20
  `, [roomId]);
  
  // Reverse to get chronological order
  return messages.reverse().map(m => `${m.username}: ${m.content}`).join('\n');
};

exports.askAI = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { prompt } = req.body;
    const userId = req.user.userId;

    if (!prompt) return res.status(400).json({ message: 'Prompt is required' });

    if (!(await verifyMembership(roomId, userId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get room chat context
    const chatContext = await getRecentChatContext(roomId);
    
    const systemPrompt = `You are an AI Study Assistant in a collaborative study room. 
Here is the recent chat history for context:
${chatContext}

Please answer the user's question concisely and helpfully.
User asks: ${prompt}`;

    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: systemPrompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const data = await response.json();
    res.json({ answer: data.response });

  } catch (error) {
    console.error('askAI Error (Ollama):', error);
    if (error.cause && error.cause.code === 'ECONNREFUSED') {
      return res.status(503).json({ message: 'The local AI service (Ollama) is not running or unreachable. Please start Ollama.' });
    }
    res.status(500).json({ message: 'Failed to generate AI response. Please check your local Ollama instance.' });
  }
};

exports.generateFlashcards = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { topicContext } = req.body || {}; // Optional explicit text to generate flashcards from
    const userId = req.user.userId;

    if (!(await verifyMembership(roomId, userId))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let sourceMaterial = topicContext;
    if (!sourceMaterial) {
      sourceMaterial = await getRecentChatContext(roomId);
    }

    if (!sourceMaterial || sourceMaterial.trim() === '') {
      return res.status(400).json({ message: 'No content available to generate flashcards.' });
    }

    const systemPrompt = `You are a Flashcard Generator.
Generate exactly 5 flashcards based on the following study context.
You MUST return ONLY a valid JSON array of objects, with each object having a 'question' string and an 'answer' string. Do NOT wrap the JSON in markdown code blocks. Do NOT output any conversational text like "Here are the flashcards". Output strictly the raw JSON array.

Context:
${sourceMaterial}`;

    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: systemPrompt,
        stream: false,
        format: 'json'
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const data = await response.json();
    let text = data.response;

    // Clean up potential markdown formatting around JSON just in case
    if (text.startsWith('\`\`\`json')) {
      text = text.replace(/^\`\`\`json\n/, '').replace(/\n\`\`\`$/, '');
    } else if (text.startsWith('\`\`\`')) {
      text = text.replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');
    }

    const flashcards = JSON.parse(text);
    console.log(flashcards)
    res.json({ flashcards });

  } catch (error) {
    console.error('generateFlashcards Error (Ollama):', error);
    if (error.cause && error.cause.code === 'ECONNREFUSED') {
      return res.status(503).json({ message: 'The local AI service (Ollama) is not running or unreachable. Please start Ollama.' });
    }
    // Handle JSON parse error specifically
    if (error instanceof SyntaxError) {
        return res.status(500).json({ message: 'The AI model failed to return a properly formatted JSON object. Please try again.' });
    }
    res.status(500).json({ message: 'Failed to generate flashcards. Please check your local Ollama instance.' });
  }
};
