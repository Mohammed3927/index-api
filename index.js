import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// دالة تنظيف المعرفات من علامات الاقتباس الغريبة
function cleanId(id) {
  if (typeof id !== 'string') return id;
  return id.trim().replace(/[“”‘’"']/g, '');
}

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
  let { guildId, userId, botToken } = req.body;

  if (!guildId || !userId || !botToken) {
    return res.status(400).json({ error: 'Missing guildId, userId, or botToken.' });
  }

  // تنظيف المعرفات من علامات اقتباس ذكية أو غير صحيحة
  guildId = cleanId(guildId);
  if (typeof userId === 'string') {
    userId = userId.split(',').map(id => cleanId(id));
  } else {
    userId = [cleanId(userId)];
  }

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

    for (const uid of userId) {
      try {
        let member;

        if (guild.members) {
          try {
            member = await guild.members.fetch(uid);
          } catch {
            await guild.members.fetch();
            member = guild.members.cache.get(uid);
          }
        } else {
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
