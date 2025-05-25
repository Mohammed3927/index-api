import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post('/get-highest-role-position', async (req, res) => {
  const { guildId, userId, botToken } = req.body;

  if (!guildId || !userId || !botToken) {
    return res.status(400).json({ error: 'Missing guildId, userId, or botToken.' });
  }

  // تأكد أن id قيمته string دائمًا
  const guildIdStr = String(guildId);
  const userIds = Array.isArray(userId) ? userId.map(String) : [String(userId)];

  // إنشاء البوت مع Intents كاملة
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ]
  });

  try {
    await client.login(botToken);

    const guild = await client.guilds.fetch(guildIdStr).catch(() => null);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found or bot not in the guild.' });
    }

    const results = [];

    for (let i = 0; i < userIds.length; i++) {
      const uid = userIds[i];

      try {
        const member = await guild.members.fetch(uid).catch(() => null);
        if (!member) {
          results.push({
            index: i,
            userId: uid,
            error: 'Member not found or inaccessible.'
          });
          continue;
        }

        const highestRole = member.roles.cache
          .filter(role => role.id !== guild.id)
          .sort((a, b) => b.position - a.position)
          .first();

        results.push({
          index: i,
          userId: uid,
          roleName: highestRole?.name || null,
          roleId: highestRole?.id || null,
          position: highestRole?.position ?? null
        });

      } catch (err) {
        results.push({
          index: i,
          userId: uid,
          error: 'Error fetching member data.',
          details: err.message
        });
      }
    }

    res.json({ results });

  } catch (error) {
    res.status(500).json({
      error: 'Unexpected error while fetching data.',
      details: error.message
    });
  } finally {
    await client.destroy();
  }
});

app.listen(port, () => {
  console.log(`✅ API running at http://localhost:${port}`);
});
