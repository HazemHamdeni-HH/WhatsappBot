const express = require('express');
const path = require('path');
const fs = require('fs');
const WhatsAppBot = require('./src/whatsappBot');

const app = express();
const PORT = process.env.PORT || 3000; 
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send('Le bot WhatsApp est en cours d\'exécution.');
});

app.listen(PORT, () => {
  console.log(`Serveur web démarré sur le port ${PORT}`);
});

console.log('Démarrage du bot WhatsApp...');
const bot = new WhatsAppBot();
bot.start();
