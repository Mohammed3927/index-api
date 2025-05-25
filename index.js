import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// ✅ /get-word: يدعم index واحد أو مصفوفة
app.post('/get-word', (req, res) => {
  const { text, index } = req.body;

  if (typeof text !== 'string' || (index === undefined || index === null)) {
    return res.status(400).json({ error: 'Invalid request. Send text (string) and index (number or comma-separated).' });
  }

  const words = text.trim().split(/\s+/);
  const indices = typeof index === 'string' ? index.split(',').map(i => parseInt(i.trim())).filter(i => !isNaN(i)) : [index];

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

    // طباعة للتأكد من وجود guild.members
    console.log('guild.members:', guild.members);

    const results = [];

    for (const uid of userIds) {
      try {
        let member;

        if (guild.members) {
          // حاول تجلب العضو مباشرة
          try {
            member = await guild.members.fetch(uid);
          } catch {
            // لو ما نجح، حاول تجلب جميع الأعضاء أولًا ثم تجلب العضو من الكاش
            await guild.members.fetch();
            member = guild.members.cache.get(uid);
          }
        } else {
          // إذا guild.members غير موجود، نرمي خطأ
          throw new Error('guild.members is undefined');
        }

        if (!member) {
          throw new Error(`Member with ID ${uid} not found`);
        }

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
        console.error(`Error fetching member or role for userId ${uid}:`, err);
        results.push({
          userId: uid,
          error: 'Failed to fetch user or role',
          details: err.message || String(err)
        });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch role information.' });
  } finally {
    await tempClient.destroy();
  }
});

app.listen(port, () => {
  console.log(`✅ API running on http://localhost:${port}`);
});
