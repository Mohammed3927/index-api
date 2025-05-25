import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';

const app = express();
const port = process.env.PORT || 3000;

// السيرفر الثابت
const GUILD_ID = "1294995530950377573";

app.use(express.json());

// تعديل /get-word لقبول مصفوفة من الطلبات بدل مصفوفة من اندكسات
app.post('/get-word', (req, res) => {
  const { text, requests } = req.body;

  if (typeof text !== 'string' || !Array.isArray(requests)) {
    return res.status(400).json({ error: 'Invalid request. Send text (string) and requests (array).' });
  }

  if (requests.length > 5) {
    return res.status(400).json({ error: 'Maximum 5 requests allowed.' });
  }

  const words = text.trim().split(/\s+/);

  // نتأكد ان كل طلب فيه index رقم صحيح
  for (const reqItem of requests) {
    if (typeof reqItem.index !== 'number' || reqItem.index < 0 || !Number.isInteger(reqItem.index)) {
      return res.status(400).json({ error: 'Each request must have a valid integer index >= 0.' });
    }
  }

  // نعالج كل طلب لوحده
  const results = requests.map(r => words[r.index] ?? null);

  res.json({ words: results });
});

// تعديل /get-highest-role-position لقبول مصفوفة من الطلبات كل واحد فيها userId منفصل
app.post('/get-highest-role-position', async (req, res) => {
  const { botToken, requests } = req.body;

  if (!botToken || !Array.isArray(requests)) {
    return res.status(400).json({ error: 'Missing botToken or requests array.' });
  }

  if (requests.length > 5) {
    return res.status(400).json({ error: 'Maximum 5 requests allowed.' });
  }

  // كل عنصر في requests لازم يحتوي userId (string)
  for (const reqItem of requests) {
    if (typeof reqItem.userId !== 'string' || !reqItem.userId.trim()) {
      return res.status(400).json({ error: 'Each request must have a valid userId string.' });
    }
  }

  const tempClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers
    ]
  });

  try {
    await tempClient.login(botToken);
    const guild = await tempClient.guilds.fetch(GUILD_ID);

    const roles = [];

    for (const reqItem of requests) {
      const userId = reqItem.userId;
      try {
        const member = await guild.members.fetch(userId);

        const highestRole = member.roles.cache
          .filter(role => role.id !== guild.id)
          .sort((a, b) => b.position - a.position)
          .first();

        roles.push({
          userId,
          roleName: highestRole?.name || null,
          roleId: highestRole?.id || null,
          position: highestRole?.position ?? null
        });
      } catch (err) {
        roles.push({
          userId,
          error: 'User not found or cannot fetch member.'
        });
      }
    }

    res.json({ roles });
  } catch (error) {
    console.error('❌ Error fetching role:', error);
    res.status(500).json({ error: 'Failed to fetch role information.' });
  } finally {
    await tempClient.destroy();
  }
});

app.listen(port, () => {
  console.log(`✅ API running on http://localhost:${port}`);
});
