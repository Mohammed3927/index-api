const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const fs = require('fs');
const path = require('path');
const config = require('./config');

// ====== البوت الأساسي (اللي عليه الأوامر) ======

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.config = config;
client.commands = new Collection();
const commandFiles = fs.readdirSync('./discord-message-counter-bot/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./discord-message-counter-bot/commands/${file}`);
  client.commands.set(command.name, command);
}

client.dbPath = path.join(__dirname, 'database.json');
client.db = JSON.parse(fs.readFileSync(client.dbPath));

client.saveDB = () => {
  fs.writeFileSync(client.dbPath, JSON.stringify(client.db, null, 2));
};

client.on('interactionCreate', async interaction => {
  if (interaction.isStringSelectMenu()) {
    const selected = interaction.values[0];
    const userId = interaction.user.id;

    if (client.db.selectedClan[userId]) {
      return interaction.reply({ content: '❌ لقد اخترت كلان بالفعل ولا يمكنك تغييره.', flags: 64 });
    }

    client.db.selectedClan[userId] = selected;

    if (!client.db.clans[selected]) {
      client.db.clans[selected] = { messages: 0, rep: 0, members: [], missions: 0 };
    }

    if (!client.db.clans[selected].members.includes(userId)) {
      client.db.clans[selected].members.push(userId);
    }

    client.saveDB();
    return interaction.reply({ content: `✅ تم تسجيلك في كلان **${selected}** بنجاح!`, flags: 64 });
  }

  if (interaction.isButton()) {
    const [action, targetPage] = interaction.customId.split('_');
    if (!interaction.message || !interaction.message.embeds.length) return;

    const embed = interaction.message.embeds[0];
    const type = embed.title.includes('شخصية') ? 'per' : 'clan';
    const missions = client.db.missions[type];
    const page = parseInt(targetPage);

    const paginated = missions
      .slice((page - 1) * 10, page * 10)
      .map((m, i) => `${(page - 1) * 10 + i + 1}. ${m}`)
      .join('\n') || 'لا توجد مهام';

    const newEmbed = EmbedBuilder.from(embed)
      .setDescription(paginated)
      .setFooter({ text: `Page ${page}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`page_${page - 1}`).setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(page === 1),
      new ButtonBuilder().setCustomId(`page_${page + 1}`).setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(page * 10 >= missions.length)
    );

    await interaction.update({ embeds: [newEmbed], components: [row] });
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const userClan = client.db.selectedClan[userId];

  if (!client.db.users[userId]) client.db.users[userId] = { rep: 0, given: 0, messages: 0 };
  client.db.users[userId].messages++;

  if (userClan && client.db.clans[userClan]) {
    client.db.clans[userClan].messages++;
  }

  if (client.db.users[userId].messages === 100) {
    const congrats = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.guild.iconURL() })
      .setDescription('🎉 مبروك! وصلت 100 رسالة في السيرفر!')
      .setFooter({ text: 'استمر في التفاعل!' });

    message.channel.send({ embeds: [congrats] });
  }

  client.saveDB();

  if (!message.content.startsWith(config.prefix)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  const command = client.commands.get(commandName);

  const isAdmin = message.member.permissions.has('Administrator');
  const hasRole = message.member.roles.cache.has(config.allowedRoleId);
  const inAllowedChannel = message.channel.id === config.allowedChannelId;

  if (!command) return;

  if (!isAdmin) {
    if (!hasRole) return message.reply('❌ ما تملك الصلاحية لاستعمال هذا الأمر.');
    if (!inAllowedChannel) return message.reply('❌ ما تقدر تستخدم الأوامر إلا في الروم المخصص.');
  }

  if (command.clanRequired && !client.db.selectedClan[userId]) {
    return message.reply('❌ يجب أن تكون داخل كلان لاستخدام هذا الأمر.');
  }

  try {
    await command.execute(message, args, client);
  } catch (err) {
    console.error(err);
    message.reply('⚠️ حدث خطأ أثناء تنفيذ الأمر.');
  }
});

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  client.user.setPresence({
    activities: [{
      name: 'ASWAYZ Community',
      type: 1,
      url: 'https://twitch.tv/mtnews'
    }],
    status: 'online'
  });
});

client.login(config.token);

// ====== تشغيل البوتات الإضافية (للحالة فقط) ======

if (Array.isArray(config.token2)) {
  config.token2.forEach((token, index) => {
    const statusClient = new Client({
      intents: [GatewayIntentBits.Guilds]
    });

    statusClient.once('ready', () => {
      console.log(`🟢 Status Bot ${index + 1} Logged in as ${statusClient.user.tag}`);
      statusClient.user.setPresence({
        activities: [{
          name: 'ASWAYZ Community',
          type: 1,
          url: 'https://twitch.tv/mtnews'
        }],
        status: 'online'
      });
    });

    statusClient.login(token);
  });
}
