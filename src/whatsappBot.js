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
        this.dataPath = path.join(__dirname, '..', 'data');
        this.tempPath = path.join(__dirname, '..', 'temp');
        this.pendingNewDataPath = null;

        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath);
        }
        if (!fs.existsSync(this.tempPath)) {
            fs.mkdirSync(this.tempPath);
        }
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
            console.log(`--- NOUVEAU MESSAGE ---`);
            console.log(`Body: "${message.body}" | From: ${message.from} | FromMe: ${message.fromMe} | Type: ${message.type}`);
            console.log(`Has Media: ${message.hasMedia}`);
            console.log(`---------------------`);

            if (message.hasMedia && message.type === 'document') {
                console.log(">>> CONDITION 'document' VRAIE");
                if (message.body === 'data.xlsx') {
                    console.log(">>> NOM DU FICHIER 'data.xlsx' CORRECT");
                    await this.handleNewDataFile(message);
                } else {
                    console.log(`>>> NOM DU FICHIER INCORRECT: ${message.body}`);
                }
            }
            else if (message.type === 'chat') {
                console.log(">>> CONDITION 'chat' VRAIE");
                if (!message.body.startsWith('!')) {
                    return;
                }

                if (message.body.toLowerCase() === '!loadnewdata') {
                    await this.handleLoadNewData(message);
                    return;
                }

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
    async handleNewDataFile(message) {
        try {
            console.log('Fichier data.xlsx reçu. Téléchargement...');
            const mediaData = await message.downloadMedia();
            const newFilePath = path.join(this.tempPath, 'data_new.xlsx');
            fs.writeFileSync(newFilePath, mediaData.data, 'base64');

            this.pendingNewDataPath = newFilePath;
            console.log(`Fichier téléchargé et sauvegardé dans ${newFilePath}`);

            await message.reply('✅ Fichier `data.xlsx` reçu et prêt à être chargé.\nTapez `!loadnewdata` pour finaliser la mise à jour.');
        } catch (error) {
            console.error('Erreur lors du téléchargement du fichier:', error);
            await message.reply('❌ Erreur lors du téléchargement du fichier. Veuillez réessayer.');
        }
    }

    async handleLoadNewData(message) {
        if (!this.pendingNewDataPath) {
            await message.reply('❌ Aucun nouveau fichier `data.xlsx` en attente. Veuillez d\'abord envoyer un fichier.');
            return;
        }

        try {
            const finalDataPath = path.join(this.dataPath, 'data.xlsx');

            if (fs.existsSync(finalDataPath)) {
                console.log("Suppression de l'ancien fichier data.xlsx...");
                fs.unlinkSync(finalDataPath);
            }

            console.log("Renommage du nouveau fichier en data.xlsx...");
            fs.renameSync(this.pendingNewDataPath, finalDataPath);

            this.pendingNewDataPath = null;

            this.excelReader.reloadData();

            console.log('Fichier de données mis à jour et rechargé avec succès.');
            await message.reply('✅ Données mises à jour avec succès ! Le bot utilise maintenant le nouveau fichier.');

        } catch (error) {
            console.error('Erreur lors du chargement des nouvelles données:', error);
            await message.reply('❌ Une erreur est survenue lors de la mise à jour des données. Vérifiez les permissions des dossiers.');
        }
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