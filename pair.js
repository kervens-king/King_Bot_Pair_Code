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
    } catch (e) {
        console.error('Error removing file:', e);
    }
}

router.get('/', async (req, res) => {
    let num = req.query.number;
    let dirs = './' + (num || `session`);

    // Remove existing session if present
    await removeFile(dirs);

    // Clean the phone number - remove any non-digit characters
    num = num.replace(/[^0-9]/g, '');

    // Validate the phone number using awesome-phonenumber
    const phone = pn('+' + num);
    if (!phone.isValid()) {
        if (!res.headersSent) {
            return res.status(400).send({ code: 'Numéro de téléphone invalide. Veuillez entrer votre numéro international complet (ex: 50942588377 pour Haïti) sans + ou espaces.' });
        }
        return;
    }
    // Use the international number format (E.164, without '+')
    num = phone.getNumber('e164').replace('+', '');

    async function initiateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(dirs);

        try {
            const { version, isLatest } = await fetchLatestBaileysVersion();
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

            KingBot.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, isNewLogin, isOnline } = update;

                if (connection === 'open') {
                    console.log("✅ KING DIVIN Connecté avec succès!");
                    console.log("📱 Envoi de la session KING...");
                    
                    try {
                        const sessionData = fs.readFileSync(dirs + '/creds.json');

                        // Send session file to user
                        const userJid = jidNormalizedUser(num + '@s.whatsapp.net');
                        await KingBot.sendMessage(userJid, {
                            document: sessionData,
                            mimetype: 'application/json',
                            fileName: 'king_session.json'
                        });
                        console.log("📄 Session KING envoyée avec succès");

                        // Envoyer l'image KING avec caption
                        await KingBot.sendMessage(userJid, {
                            image: { url: KING_IMAGE_URL },
                            caption: `👑 *KING DIVIN - Légende Divine* 👑\n\nVotre session a été connectée avec succès !\n\nRejoignez le royaume :\n📢 Canal: https://whatsapp.com/channel/0029Vb6KikfLdQefJursHm20\n👥 Groupe: https://chat.whatsapp.com/GIIGfaym8V7DZZElf6C3Qh\n\n« Au stade le plus tragique et plus belle » ✨`
                        });
                        console.log("👑 Image KING envoyée avec succès");

                        // Message KING DIVIN
                        await KingBot.sendMessage(userJid, {
                            text: `✅ *SESSION KING DIVIN CONNECTÉE* ✅\n\n👑 Créateur: Kervens King\n📞 Contact: 50942588377\n💻 GitHub: Kervens-King\n\n« Au stade le plus tragique et plus belle »`
                        });
                        console.log("📝 Message KING envoyé avec succès");

                        // Message d'avertissement
                        await KingBot.sendMessage(userJid, {
                            text: `⚠️ *ATTENTION - SESSION KING DIVIN* ⚠️\n\nNe partagez PAS ce fichier avec qui que ce soit !\nCette session contient vos accès personnels.\n\n👑 Gardez-la en sécurité !\n\n© 2024 KING DIVIN`
                        });
                        console.log("⚠️ Message d'avertissement envoyé");

                        // Clean up session after use
                        console.log("🧹 Nettoyage de la session KING...");
                        await delay(1000);
                        removeFile(dirs);
                        console.log("✅ Session KING nettoyée avec succès");
                        console.log("🎉 Processus KING DIVIN terminé avec succès!");
                    } catch (error) {
                        console.error("❌ Erreur envoi messages KING:", error);
                        // Still clean up session even if sending fails
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

                    if (statusCode === 401) {
                        console.log("❌ Déconnecté de WhatsApp. Génération d'un nouveau code pair.");
                    } else {
                        console.log("🔁 Connexion fermée - redémarrage...");
                        initiateSession();
                    }
                }
            });

            if (!KingBot.authState.creds.registered) {
                await delay(3000); // Wait 3 seconds before requesting pairing code
                num = num.replace(/[^\d+]/g, '');
                if (num.startsWith('+')) num = num.substring(1);

                try {
                    let code = await KingBot.requestPairingCode(num);
                    code = code?.match(/.{1,4}/g)?.join('-') || code;
                    if (!res.headersSent) {
                        console.log({ num, code });
                        await res.send({ code });
                    }
                } catch (error) {
                    console.error('Erreur génération code pair:', error);
                    if (!res.headersSent) {
                        res.status(503).send({ code: 'Échec de génération du code pair. Vérifiez votre numéro et réessayez.' });
                    }
                }
            }

            KingBot.ev.on('creds.update', saveCreds);
        } catch (err) {
            console.error('Erreur initialisation session:', err);
            if (!res.headersSent) {
                res.status(503).send({ code: 'Service Indisponible' });
            }
        }
    }

    await initiateSession();
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
