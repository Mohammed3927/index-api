import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// ثبّت معرف السيرفر (guild) هنا
const GUILD_ID = '1294995530950377573';

let client = null;
let isReady = false;

// دالة تهيئة وتشغيل البوت مع التوكن
async function startClient(botToken) {
  if (client) {
    await client.destroy();
    client = null;
    isReady = false;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
  });

  client.once('ready', () => {
    isReady = true;
    console.log(`Bot logged in as ${client.user.tag}`);
  });

  await client.login(botToken);

  // انتظر حتى يجهز البوت
  await new Promise(resolve => {
    if (isReady) resolve();
    else client.once('ready', () => resolve());
  });
}

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

// مسار get-highest-role-position يستخدم guild ثابت
app.post('/get-highest-role-position', async (req, res) => {
  const { userId, botToken } = req.body;

  if (!userId || !botToken) {
    return res.status(400).json({ error: 'Missing userId or botToken.' });
  }

  const userIds = Array.isArray(userId) ? userId.map(String) : [String(userId)];

  try {
    if (!client || !isReady) {
      await startClient(botToken);
    }

    const guild = await client.guilds.fetch(GUILD_ID).catch(() => null);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found or bot not in the guild.' });
    }

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
  }
});

app.listen(port, () => {
  console.log(`✅ API running at http://localhost:${port}`);
});
