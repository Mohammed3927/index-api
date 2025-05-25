import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// ✅ /get-word: يدعم index واحد أو مصفوفة
app.post('/get-word', (req, res) => {
  const { text, index } = req.body;

  if (typeof text !== 'string' || (!index && index !== 0)) {
    return res.status(400).json({ error: 'Invalid request. Send text (string) and index (number or comma-separated).' });
  }

  const words = text.trim().split(/\s+/);
  const indices = typeof index === 'string' ? index.split(',').map(i => parseInt(i.trim())) : [index];

  const result = indices.map(i => ({
    index: i,
    word: words[i] ?? null
  }));

  res.json({ results: result });
});

// ✅ /get-highest-role-position: يدعم userId واحد أو أكثر
app.post('/get-highest-role-position', async (req, res) => {
  const { guildId, userId, botToken } = req.body;

  if (!guildId || !userId || !botToken) {
    return res.status(400).json({ error: 'Missing guildId, userId, or botToken.' });
  }

  const userIds = typeof userId === 'string' ? userId.split(',').map(id => id.trim()) : [userId];

  const tempClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers
    ]
  });

  try {
    await tempClient.login(botToken);
    const guild = await tempClient.guilds.fetch(guildId);

    const results = [];

    for (const uid of userIds) {
      try {
        const member = await guild.members.fetch(uid);
        const highestRole = member.roles.cache
          .filter(role => role.id !== guild.id)
          .sort((a, b) => b.position - a.position)
          .first();

        results.push({
          userId: uid,
          roleName: highestRole?.name || null,
          roleId: highestRole?.id || null,
          position: highestRole?.position ?? null
        });
      } catch (err) {
        results.push({
          userId: uid,
          error: 'Failed to fetch user or role'
        });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch role information.' });
  } finally {
    await tempClient.destroy();
  }
});

app.listen(port, () => {
  console.log(`✅ API running on http://localhost:${port}`);
})
