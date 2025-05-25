import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// مسار get-word: يدعم نصوص متعددة ومؤشرات متعددة
app.post('/get-word', (req, res) => {
  let { texts, indexes } = req.body;

  if (typeof texts === 'string') texts = [texts];
  if (!Array.isArray(texts)) return res.status(400).json({ error: 'texts must be a string or array of strings.' });

  if (typeof indexes === 'number') indexes = [indexes];
  if (!Array.isArray(indexes)) return res.status(400).json({ error: 'indexes must be a number or array of numbers.' });

  const results = [];

  for (let i = 0; i < texts.length; i++) {
    const words = texts[i].trim().split(/\s+/);

    for (let j = 0; j < indexes.length; j++) {
      const idx = indexes[j];
      results.push({ textIndex: i, index: idx, word: words[idx] ?? null });
    }
  }

  res.json({ results });
});

// مسار get-highest-role-position مع تحميل كامل الأعضاء
app.post('/get-highest-role-position', async (req, res) => {
  const { guildId, userId, botToken } = req.body;

  if (!guildId || !userId || !botToken) {
    return res.status(400).json({ error: 'Missing guildId, userId, or botToken.' });
  }

  const guildIdStr = String(guildId);
  const userIds = Array.isArray(userId) ? userId.map(String) : [String(userId)];

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
  });

  try {
    await client.login(botToken);

    await new Promise(resolve => client.once('ready', () => resolve()));

    const guild = client.guilds.cache.get(guildIdStr);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found in cache.' });
    }

    // تحميل كامل الأعضاء (يحتاج صلاحيات)
    await guild.members.fetch();

    const results = [];

    for (let i = 0; i < userIds.length; i++) {
      const uid = userIds[i];

      try {
        const member = guild.members.cache.get(uid);
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
    res.status(500).json({ error: 'Unexpected error.', details: error.message });
  } finally {
    await client.destroy();
  }
});

app.listen(port, () => {
  console.log(`✅ API running at http://localhost:${port}`);
});
