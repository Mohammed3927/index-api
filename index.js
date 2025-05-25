const express = require('express');
const app = express();
app.use(express.json());

function getParam(req, key) {
    return req.body[key] || req.query[key] || req.headers[key];
}

// ========== GET WORDS ==========
app.all('/get-words', (req, res) => {
    const sentence = getParam(req, 'sentence');
    let indexes = getParam(req, 'indexes');

    if (!sentence || indexes === undefined) {
        return res.status(400).send('يجب توفير sentence و indexes.');
    }

    if (typeof indexes === 'string') {
        indexes = indexes.split(',').map(i => parseInt(i));
    } else if (typeof indexes === 'number') {
        indexes = [indexes];
    } else if (Array.isArray(indexes)) {
        indexes = indexes.map(i => parseInt(i));
    } else {
        return res.status(400).send('indexes يجب أن تكون رقم أو نص أو مصفوفة.');
    }

    const words = sentence.split(' ');
    let responseText = indexes.map(i => words[i] || '').join('\n');

    res.setHeader('Content-Type', 'text/plain');
    res.send(responseText);
});

// ========== GET HIGHEST ROLE ==========
app.all('/get-highest-role', (req, res) => {
    let users = getParam(req, 'users');

    if (!users) {
        return res.status(400).send('يجب توفير users.');
    }

    if (typeof users === 'string') {
        users = users.split(',').map(u => u.trim());
    } else if (!Array.isArray(users)) {
        users = [users];
    }

    const mockUsers = {
        "user1": [
            { role: "Admin", position: 4 },
            { role: "Member", position: 1 },
            { role: "Moderator", position: 2 }
        ],
        "user2": [
            { role: "Owner", position: 5 },
            { role: "Guest", position: 0 },
            { role: "Helper", position: 2 }
        ],
        "user3": [
            { role: "VIP", position: 3 },
            { role: "User", position: 1 }
        ]
    };

    let responseText = '';

    users.forEach(userId => {
        const roles = mockUsers[userId] || [];
        if (roles.length === 0) {
            responseText += `-1\nUnknown\n`; // في حال ما فيه بيانات
            return;
        }

        const topRole = roles.reduce((best, role) =>
            role.position > best.position ? role : best
        );

        responseText += `${topRole.position}\n${topRole.role}\n`;
    });

    res.setHeader('Content-Type', 'text/plain');
    res.send(responseText.trim());
});

// ========== تشغيل السيرفر ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ السيرفر شغال على http://localhost:${PORT}`);
});
