app.post('/get-highest-role-position', async (req, res) => {
  const { guildId, userId, botToken } = req.body;

  if (!guildId || !userId || !botToken) {
    return res.status(400).json({ error: 'Missing guildId, userId, or botToken.' });
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
        } catch (memberError) {
          results.push({
            index: i,
            userId: userId[i],
            error: 'Failed to fetch member or roles.',
            details: memberError.message
          });
        }
      }

      return res.json({ results });
    }

    return res.status(400).json({ error: 'userId must be string or array of strings.' });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch role information.',
      details: error.message
    });
  } finally {
    await tempClient.destroy();
  }
});
