import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post('/get-word', (req, res) => {
  const { text, index } = req.body;

  if (typeof text !== 'string' || typeof index !== 'number') {
    return res.status(400).json({ error: 'Invalid request. Send text (string) and index (number).' });
  }

  const words = text.trim().split(/\s+/);
  const word = words[index] ?? null;

  res.json({ word });
});

app.listen(port, () => {
  console.log(`✅ API running on http://localhost:${port}`);
});
