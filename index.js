import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// ✅ existing endpoint: /get-word
app.post('/get-word', (req, res) => {
  const { text, index } = req.body;

  if (typeof text !== 'string' || typeof index !== 'number') {
    return res.status(400).json({ error: 'Invalid request. Send text (string) and index (number).' });
  }

  const words = text.trim().split(/\s+/);
  const word = words[index] ?? null;

  res.json({ word });
});

// ✅ new endpoint: /get-highest-role-position
app.post('/get-highest-role-position', async (req, res) => {
  const { guildId, userId, botToken } = req.body;

  if (!guildId || !userId || !botToken) {
    return res.status(400).json({ error: 'Missing guildId, userId, or botToken.' });
  }

  // Create temporary Discord client
  const tempClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers
    ]
  });

  try {
    // Login using token sent in request
    await tempClient.login(botToken);

    const guild = await tempClient.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);

    const highestRole = member.roles.cache
      .filter(role => role.id !== guild.id) // Ignore @everyone
      .sort((a, b) => b.position - a.position)
      .first();

    res.json({
      roleName: highestRole?.name || null,
      roleId: highestRole?.id || null,
      position: highestRole?.position ?? null
    });
  } catch (error) {
    console.error('❌ Error fetching role:', error);
    res.status(500).json({ error: 'Failed to fetch role information.' });
  } finally {
    await tempClient.destroy(); // Always clean up
  }
});

app.listen(port, () => {
  console.log(`✅ API running on http://localhost:${port}`);
});
