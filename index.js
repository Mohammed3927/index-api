import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// /get-word - supports single index or array of indexes
app.post('/get-word', (req, res) => {
  const { text, index } = req.body;

  if (typeof text !== 'string' || (!Array.isArray(index) && typeof index !== 'number')) {
    return res.status(400).json({ error: 'Send text (string) and index (number) or array of numbers.' });
  }

  const words = text.trim().split(/\s+/);

  // إذا index رقم
  if (typeof index === 'number') {
    const word = words[index] ?? null;
    return res.json({ word });
  }

  // إذا index مصفوفة أرقام
  const results = index.map((i, idx) => ({
    index: idx,
    word: words[i] ?? null
  }));

  res.json({ results });
});

// /get-highest-role-position - supports single userId or array of userIds
app.post('/get-highest-role-position', async (req, res) => {
  const { guildId, userId, botToken } = req.body;

  if (!guildId || !userId || !botToken) {
    return res.status(400).json({ error: 'Missing guildId, userId, or botToken.' });
  }

  // بوت مؤقت
  const tempClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers
    ]
  });

  try {
    await tempClient.login(botToken);
    const guild = await tempClient.guilds.fetch(guildId);

    // لو userId عنصر واحد (string)
    if (typeof userId === 'string') {
      const member = await guild.members.fetch(userId);

      const highestRole = member.roles.cache
        .filter(role => role.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .first();

      return res.json({
        roleName: highestRole?.name || null,
        roleId: highestRole?.id || null,
        position: highestRole?.position ?? null
      });
    }

    // لو userId مصفوفة
    if (Array.isArray(userId)) {
      const results = [];
      for (let i = 0; i < userId.length; i++) {
        try {
          const member = await guild.members.fetch(userId[i]);
          const highestRole = member.roles.cache
            .filter(role => role.id !== guild.id)
            .sort((a, b) => b.position - a.position)
            .first();

          results.push({
            index: i,
            userId: userId[i],
            roleName: highestRole?.name || null,
            roleId: highestRole?.id || null,
            position: highestRole?.position ?? null
          });
        } catch (e) {
          results.push({
            index: i,
            userId: userId[i],
            error: 'Failed to fetch member or roles.'
          });
        }
      }

      return res.json({ results });
    }

    // لو userId مو string ولا array (خطأ)
    return res.status(400).json({ error: 'userId must be string or array of strings.' });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Failed to fetch role information.' });
  } finally {
    await tempClient.destroy();
  }
});

app.listen(port, () => {
  console.log(`✅ API running on http://localhost:${port}`);
});
