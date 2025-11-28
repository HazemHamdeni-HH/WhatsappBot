const WhatsAppBot = require('./src/whatsappBot');

console.log('Démarrage du bot WhatsApp...');

// Créer et démarrer le bot
const bot = new WhatsAppBot();
bot.start();