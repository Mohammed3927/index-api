import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

function cleanId(id) {
  if (typeof id !== 'string') return id;
  return id.trim().replace(/[“”‘’"']/g, '');
}

app.post('/get-highest-role-position', async (req, res) => {
  let { guildId, userId, botToken } = req.body;

  if (!guildId || !userId || !botToken) {
    return res.status(400).json({ error: 'Missing guildId, userId, or botToken.' });
  }

  guildId = cleanId(guildId);
  const userIds = typeof userId === 'string'
    ? userId.split(',').map(id => cleanId(id))
    : [cleanId(userId)];

  const tempClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers
    ]
  });

  try {
    await tempClient.login(botToken);

    // ننتظر لما البوت يكون جاهز
    await new Promise(resolve => tempClient.once('ready', resolve));

    const guild = tempClient.guilds.cache.get(guildId);

    if (!guild) {
      throw new Error('Guild not found in cache. Make sure the bot is in the server and has access.');
    }

    // تحميل جميع أعضاء السيرفر إلى الكاش
    await guild.members.fetch();

    const results = [];

    for (const uid of userIds) {
      try {
        const member = guild.members.cache.get(uid);

        if (!member) {
          throw new Error(`Member with ID ${uid} not found after fetching.`);
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
        results.push({
          userId: uid,
          error: 'Failed to fetch user or role',
          details: err.message || String(err)
        });
      }
    }

    res.json({ results });
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: err.message || 'Unexpected error occurred.' });
  } finally {
    await tempClient.destroy();
  }
});

app.listen(port, () => {
  console.log(`✅ API running on http://localhost:${port}`);
});

