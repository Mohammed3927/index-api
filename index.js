app.post('/get-highest-role-position', async (req, res) => {
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  const botToken = req.headers.authorization;

  if (!botToken) {
    return res.status(401).json({ error: 'Missing Authorization header.' });
  }

  let requests = [];

  if (Array.isArray(req.body.requests)) {
    requests = req.body.requests;
  } else {
    const users = Object.keys(req.body)
      .filter(key => key.startsWith('user'))
      .slice(0, 5)
      .map(key => ({ userId: req.body[key] }));

    if (users.length > 0) {
      requests = users;
    }
  }

  if (!requests || requests.length === 0) {
    return res.status(400).json({ error: 'Missing userId(s) or requests array.' });
  }

  if (requests.length > 5) {
    return res.status(400).json({ error: 'Maximum 5 requests allowed.' });
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
      console.log(`🔍 Trying to fetch member with ID: ${userId}`);

      try {
        const member = await guild.members.fetch(userId);

        const highestRole = member.roles.cache
          .filter(role => role.id !== guild.id)
          .sort((a, b) => b.position - a.position)
          .first();

        console.log(`✅ Fetched member: ${member.user.tag}, Highest role: ${highestRole?.name || 'None'}`);

        roles.push({
          userId,
          roleName: highestRole?.name || null,
          roleId: highestRole?.id || null,
          position: highestRole?.position ?? null
        });
      } catch (err) {
        console.error(`❌ Failed to fetch member with ID: ${userId}`, err.message);
        roles.push({
          userId,
          error: 'User not found or cannot fetch member.'
        });
      }
    }

    res.json({ roles });
  } catch (error) {
    console.error('❌ Error setting up client or fetching guild:', error);
    res.status(500).json({ error: 'Failed to fetch role information.' });
  } finally {
    await tempClient.destroy();
  }
});
