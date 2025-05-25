import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// ✅ Get word(s) by index or multiple indexes
app.post('/get-word', (req, res) => {
  const { text, index } = req.body;

  if (typeof text !== 'string' || (!Array.isArray(index) && typeof index !== 'number')) {
    return res.status(400).json({ error: 'Invalid request. Send text (string) and index (number or array).' });
  }

  const words = text.trim().split(/\s+/);
  const indexes = Array.isArray(index) ? index : [index];

  const results = indexes.map((i, idx) => ({
    index: idx,
    word: words[i] ?? null
  }));

  res.json({ results });
});

// ✅ Get highest role position(s)
app.post('/get-highest-role-position', async (req, res) => {
  const { guildId, userId, botToken } = req.body;

  if (!guildId || !userId || !botToken) {
    return res.status(400).json({ error: 'Missing guildId, userId, or botToken.' });
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
  });

  try {
    await client.login(botToken);
    const guild = await client.guilds.fetch(guildId);

    const ids = Array.isArray(userId) ? userId : [userId];

    const results = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        const member = await guild.members.fetch(id);
        const highestRole = member.roles.cache
          .filter(role => role.id !== guild.id)
          .sort((a, b) => b.position - a.position)
          .first();

        results.push({
          index: i,
          userId: id,
          roleName: highestRole?.name || null,
          roleId: highestRole?.id || null,
          position: highestRole?.position ?? null
        });
      } catch (err) {
        results.push({
          index: i,
          userId: id,
          error: 'Failed to fetch member or roles.',
          details: err.message
        });
      }
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch role information.',
      details: error.message
    });
  } finally {
    await client.destroy();
  }
});

app.listen(port, () => {
  console.log(`✅ API running at http://localhost:${port}`);
});
