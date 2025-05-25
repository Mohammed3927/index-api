import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

const GUILD_ID = '1294995530950377573';

let client;
let isReady = false;

async function startClient(botToken) {
  if (client) {
    await client.destroy();
    client = null;
    isReady = false;
  }

  client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });

  client.once('ready', () => {
    isReady = true;
    console.log(`Bot ready: ${client.user.tag}`);
  });

  await client.login(botToken);

  if (!isReady) {
    await new Promise(resolve => client.once('ready', resolve));
  }
}

app.post('/get-highest-role-position', async (req, res) => {
  const { userId, botToken } = req.body;
  if (!userId || !botToken) return res.status(400).json({ error: 'Missing userId or botToken.' });

  try {
    if (!client || !isReady) {
      await startClient(botToken);
    }

    const guild = await client.guilds.fetch(GUILD_ID).catch(() => null);
    if (!guild) return res.status(404).json({ error: 'Guild not found or bot not in the guild.' });

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return res.status(404).json({ error: 'Member not found or inaccessible.' });

    // رتبة العضو الأعلى
    const highestRole = member.roles.cache
      .filter(role => role.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .first();

    res.json({
      userId,
      roleName: highestRole?.name || null,
      roleId: highestRole?.id || null,
      position: highestRole?.position ?? null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Unexpected error', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
