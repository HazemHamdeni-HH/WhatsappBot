const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const CommandHandler = require('./commandHandler');
const ExcelReader = require('./excelReader');

class WhatsAppBot {
    constructor() {
        const excelPath = path.join(__dirname, '..', 'data', 'data.xlsx');
        this.excelReader = new ExcelReader(excelPath);

        this.commandHandler = new CommandHandler(this.excelReader);

        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'session-bot',
                dataPath: path.join(__dirname, '..', '.wwebjs_auth')
            }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox']
            }
        });

        this.setupEventListeners();
        this.isInitializing = false;
    }

    setupEventListeners() {
        this.client.on('qr', async (qr) => {
            console.log('QR Code reçu, scannez-le avec WhatsApp!');
            qrcode.generate(qr, { small: true });

            try {
                const publicDir = path.join(__dirname, '..', 'public');
                if (!fs.existsSync(publicDir)) {
                    fs.mkdirSync(publicDir);
                }
                await require('qrcode').toFile(path.join(publicDir, 'qrcode.png'), qr);

                const appUrl = process.env.RENDER_EXTERNAL_URL || process.env.FLY_APP_URL || `http://localhost:3000`;
                console.log(`QR Code généré! Veuillez scanner le code à l'adresse suivante : ${appUrl}/qrcode.png`);
            } catch (err) {
                console.error('Erreur lors de la génération du QR code:', err);
            }
        });

        this.client.on('ready', () => {
            console.log('Client WhatsApp prêt!');

            const myNumber = this.client.info.wid._serialized;
            console.log(`Bot démarré. Conversation initiée avec : ${myNumber}`);

            const welcomeMessage = `*🤖 Votre Bot de Recherche Excel est prêt !*\n\n` +
                `Bonjour ! Je suis un assistant que tout le monde peut utiliser.\n\n` +
                `Voici quelques commandes pour commencer :\n` +
                `• Tapez *!help* pour voir toutes les commandes.\n` +
                `• Essayez *!search مرشد* pour chercher les "مرشد".\n\n` +
                `Je suis là pour aider tout le monde !`;

            this.client.sendMessage(myNumber, welcomeMessage)
                .then(() => {
                    console.log('Message de bienvenue envoyé.');
                })
                .catch(err => {
                    console.error('Erreur lors de l\'envoi du message de bienvenue:', err);
                });
        });

        this.client.on('message_create', async (message) => {

            console.log(`Message créé: "${message.body}" | De: ${message.from} | Est de moi: ${message.fromMe} | Type: ${message.type}`);

            if (message.type === 'chat') {

                console.log(`>>> MESSAGE DÉTECTÉ : ${message.body}`);

                if (!message.body.startsWith('!')) {
                    return;
                }

                console.log(`>>> COMMANDE DÉTECTÉE : ${message.body}`);

                try {
                    const response = this.commandHandler.handleCommand(message.body, message);
                    await message.reply(response);
                    console.log('>>> RÉPONSE ENVOYÉE AVEC SUCCÈS.');
                } catch (error) {
                    console.error('>>> ERREUR lors du traitement de la commande:', error);
                    await message.reply('Désolé, une erreur technique est survenue.');
                }
            }
        });

        this.client.on('auth_failure', msg => {
            console.error('Erreur d\'authentification:', msg);
            this.restartClient();
        });

        this.client.on('disconnected', (reason) => {
            console.log('Client déconnecté:', reason);
            if (reason === 'LOGOUT' || reason === 'CONNECTION_LOST') {
                console.log('Tentative de reconnexion...');
                this.restartClient();
            }
        });
    }

    restartClient() {
        if (this.isInitializing) {
            console.log('Le client est déjà en cours d\'initialisation...');
            return;
        }

        this.isInitializing = true;
        console.log('Redémarrage du client WhatsApp...');

        this.client.destroy().then(() => {
            console.log('Client détruit. Création d\'un nouveau client...');

            this.client = new Client({
                authStrategy: new LocalAuth({
                    clientId: 'session-bot',
                    dataPath: path.join(__dirname, '..', '.wwebjs_auth')
                }),
                puppeteer: {
                    headless: true,
                    args: ['--no-sandbox']
                }
            });

            this.setupEventListeners();
            this.client.initialize().catch(err => {
                console.error('Erreur lors de l\'initialisation du client:', err);
                this.isInitializing = false;
            });
        }).catch(err => {
            console.error('Erreur lors de la destruction du client:', err);
            this.isInitializing = false;
        });
    }

    start() {
        this.client.initialize().catch(err => {
            console.error('Erreur lors de l\'initialisation du client WhatsApp:', err);
        });
    }
}

module.exports = WhatsAppBot;