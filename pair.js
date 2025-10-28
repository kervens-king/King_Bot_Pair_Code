import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers, jidNormalizedUser, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pn from 'awesome-phonenumber';

const router = express.Router();

// URL de l'image KING
const KING_IMAGE_URL = 'https://files.catbox.moe/ndj85q.jpg';

// Ensure the session directory exists
function removeFile(FilePath) {
    try {
        if (!fs.existsSync(FilePath)) return false;
        fs.rmSync(FilePath, { recursive: true, force: true });
        return true;
    } catch (e) {
        console.error('Error removing file:', e);
        return false;
    }
}

router.get('/', async (req, res) => {
    // Validation initiale de la requête
    if (!req.query.number) {
        return res.status(400).send({ code: 'Le paramètre "number" est requis.' });
    }

    let num = req.query.number.toString().trim();
    let dirs = './' + (num || `session`);

    // Nettoyer le numéro de téléphone
    num = num.replace(/[^0-9]/g, '');

    // Validation du numéro de téléphone
    if (num.length < 8) {
        return res.status(400).send({ code: 'Numéro de téléphone trop court.' });
    }

    const phone = pn('+' + num);
    if (!phone.isValid()) {
        return res.status(400).send({ code: 'Numéro de téléphone invalide. Veuillez entrer votre numéro international complet (ex: 50942588377 pour Haïti) sans + ou espaces.' });
    }

    // Formater le numéro
    num = phone.getNumber('e164').replace('+', '');

    // Nettoyer l'ancienne session
    await removeFile(dirs);

    let sessionInitialized = false;
    let responseSent = false;

    function sendResponse(data) {
        if (!responseSent) {
            responseSent = true;
            res.send(data);
        }
    }

    function sendError(error) {
        if (!responseSent) {
            responseSent = true;
            res.status(500).send({ code: error });
        }
    }

    async function initiateSession() {
        if (sessionInitialized) return;
        sessionInitialized = true;

        try {
            const { state, saveCreds } = await useMultiFileAuthState(dirs);
            const { version } = await fetchLatestBaileysVersion();

            let KingBot = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.windows('Chrome'),
                markOnlineOnConnect: false,
                generateHighQualityLinkPreview: false,
                defaultQueryTimeoutMs: 60000,
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 30000,
                retryRequestDelayMs: 250,
                maxRetries: 5,
            });

            KingBot.ev.on('creds.update', saveCreds);

            KingBot.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, isNewLogin, isOnline } = update;

                if (connection === 'open') {
                    console.log("✅ KING DIVIN Connecté avec succès!");
                    console.log("📱 Envoi de la session KING...");
                    
                    try {
                        // Attendre que le fichier de session soit créé
                        await delay(2000);
                        
                        const sessionPath = dirs + '/creds.json';
                        if (!fs.existsSync(sessionPath)) {
                            console.log("❌ Fichier de session non trouvé");
                            return;
                        }

                        const sessionData = fs.readFileSync(sessionPath);
                        const userJid = jidNormalizedUser(num + '@s.whatsapp.net');

                        // Envoyer le fichier de session
                        await KingBot.sendMessage(userJid, {
                            document: sessionData,
                            mimetype: 'application/json',
                            fileName: 'king_session.json'
                        });
                        console.log("📄 Session KING envoyée avec succès");

                        // Envoyer l'image KING
                        await KingBot.sendMessage(userJid, {
                            image: { url: KING_IMAGE_URL },
                            caption: `👑 *KING DIVIN - Légende Divine* 👑\n\nVotre session a été connectée avec succès !\n\nRejoignez le royaume :\n📢 Canal: https://whatsapp.com/channel/0029Vb6KikfLdQefJursHm20\n👥 Groupe: https://chat.whatsapp.com/GIIGfaym8V7DZZElf6C3Qh\n\n« Au stade le plus tragique et plus belle » ✨`
                        });
                        console.log("👑 Image KING envoyée avec succès");

                        // Message KING DIVIN formaté
                        const KING_MD_TEXT = `

╭─✦─╮𝐊𝐈𝐍𝐆 𝐃𝐈𝐕𝐈𝐍 𝐒𝐄𝐒𝐒𝐈𝐎𝐍╭─✦─╮
│
│   🎭 *SESSION CONNECTÉE AVEC SUCCÈS* 🎭
│   ✦ Créateur : Kervens
│   ✦ Statut : ✅ **ACTIVE & FONCTIONNELLE**
│
│   🔐 *INFORMATIONS SESSION*
│   ├• Méthode : Pair Code 📱
│   ├• Plateforme : WhatsApp Web
│   └• Version : KING DIVIN v1.0
│
│   📞 *CONTACT ROYAL*
│   ├• 👑 Kervens : 50942588377
│   ├• 💻 GitHub : Kervens-King
│   ├• 👥 Groupe : chat.whatsapp.com/GIIGfaym8V7DZZElf6C3Qh
│   └• 📢 Canal : whatsapp.com/channel/0029Vb6KikfLdQefJursHm20
│
│   🌟 *FONCTIONNALITÉS*
│   ├• Messages Illimités
│   ├• Multi-appareils
│   ├• Stabilité Garantie
│   └• Support 24/7
│
╰─✦─╯𝐋𝐄𝐆𝐄𝐍𝐃𝐄 𝐃𝐈𝐕𝐈𝐍𝐄╰─✦─╯

▄︻デ══━一 *« Au stade le plus tragique et plus belle »* 一━══デ︻▄
★彡 [ᴅᴇᴠᴇʟᴏᴘᴘé ᴘᴀʀ ᴋᴇʀᴠᴇɴs] 彡★
`;

                        await KingBot.sendMessage(userJid, { text: KING_MD_TEXT });
                        console.log("📝 Message KING formaté envoyé avec succès");

                        // Message d'avertissement
                        await KingBot.sendMessage(userJid, {
                            text: `⚠️ *ATTENTION - SESSION KING DIVIN* ⚠️\n\nNe partagez PAS ce fichier avec qui que ce soit !\nCette session contient vos accès personnels.\n\n👑 Gardez-la en sécurité !\n\n© 2024 KING DIVIN`
                        });
                        console.log("⚠️ Message d'avertissement envoyé");

                        // Nettoyage final
                        console.log("🧹 Nettoyage de la session KING...");
                        await delay(1000);
                        removeFile(dirs);
                        console.log("✅ Session KING nettoyée avec succès");
                        console.log("🎉 Processus KING DIVIN terminé avec succès!");

                    } catch (error) {
                        console.error("❌ Erreur envoi messages KING:", error);
                        removeFile(dirs);
                    }
                }

                if (isNewLogin) {
                    console.log("🔐 Nouvelle connexion via pair code KING");
                }

                if (isOnline) {
                    console.log("📶 Client KING en ligne");
                }

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    console.log("🔌 Connexion fermée, code:", statusCode);
                    
                    if (statusCode === 401) {
                        console.log("❌ Déconnecté de WhatsApp.");
                    }
                }
            });

            // Attendre avant de vérifier l'état d'authentification
            await delay(3000);

            if (!KingBot.authState.creds.registered) {
                try {
                    let code = await KingBot.requestPairingCode(num);
                    code = code?.match(/.{1,4}/g)?.join('-') || code;
                    console.log("📱 Code pair généré:", code);
                    sendResponse({ code: code });
                } catch (error) {
                    console.error('Error requesting pairing code:', error);
                    sendError('Failed to get pairing code. Please check your phone number and try again.');
                }
            }

        } catch (err) {
            console.error('Error initializing session:', err);
            sendError('Service Unavailable');
            removeFile(dirs);
        }
    }

    // Démarrer la session avec gestion d'erreur
    try {
        await initiateSession();
    } catch (error) {
        console.error('Error in main function:', error);
        if (!responseSent) {
            res.status(500).send({ code: 'Internal Server Error' });
        }
    }
});

// Global uncaught exception handler
process.on('uncaughtException', (err) => {
    let e = String(err);
    if (e.includes("conflict")) return;
    if (e.includes("not-authorized")) return;
    if (e.includes("Socket connection timeout")) return;
    if (e.includes("rate-overlimit")) return;
    if (e.includes("Connection Closed")) return;
    if (e.includes("Timed Out")) return;
    if (e.includes("Value not found")) return;
    if (e.includes("Stream Errored")) return;
    if (e.includes("Stream Errored (restart required)")) return;
    if (e.includes("statusCode: 515")) return;
    if (e.includes("statusCode: 503")) return;
    console.log('Caught exception: ', err);
});

export default router;
