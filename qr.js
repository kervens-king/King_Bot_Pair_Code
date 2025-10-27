import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, Browsers, jidNormalizedUser, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { delay } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';

const router = express.Router();

// URL de l'image KING
const KING_IMAGE_URL = 'https://files.catbox.moe/ndj85q.jpg';

// Function to remove files or directories
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
    // Generate unique session for each request to avoid conflicts
    const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const dirs = `./qr_sessions/session_${sessionId}`;

    // Ensure qr_sessions directory exists
    if (!fs.existsSync('./qr_sessions')) {
        fs.mkdirSync('./qr_sessions', { recursive: true });
    }

    async function initiateSession() {
        // ✅ PERMANENT FIX: Create the session folder before anything
        if (!fs.existsSync(dirs)) fs.mkdirSync(dirs, { recursive: true });

        const { state, saveCreds } = await useMultiFileAuthState(dirs);

        try {
            const { version, isLatest } = await fetchLatestBaileysVersion();
            
            let qrGenerated = false;
            let responseSent = false;

            // QR Code handling logic
            const handleQRCode = async (qr) => {
                if (qrGenerated || responseSent) return;
                
                qrGenerated = true;
                console.log('🟢 QR Code KING DIVIN Généré! Scannez-le avec votre WhatsApp.');
                console.log('📋 Instructions:');
                console.log('1. Ouvrez WhatsApp sur votre téléphone');
                console.log('2. Allez dans Paramètres > Appareils connectés');
                console.log('3. Appuyez sur "Associer un appareil"');
                console.log('4. Scannez le QR code ci-dessous');
                // Display QR in terminal
                //qrcodeTerminal.generate(qr, { small: true });
                try {
                    // Generate QR code as data URL
                    const qrDataURL = await QRCode.toDataURL(qr, {
                        errorCorrectionLevel: 'M',
                        type: 'image/png',
                        quality: 0.92,
                        margin: 1,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    });

                    if (!responseSent) {
                        responseSent = true;
                        console.log('QR Code KING DIVIN généré avec succès');
                        await res.send({ 
                            qr: qrDataURL, 
                            message: 'QR Code KING DIVIN Généré! Scannez-le avec votre WhatsApp.',
                            instructions: [
                                '1. Ouvrez WhatsApp sur votre téléphone',
                                '2. Allez dans Paramètres > Appareils connectés',
                                '3. Appuyez sur "Associer un appareil"',
                                '4. Scannez le QR code ci-dessus'
                            ]
                        });
                    }
                } catch (qrError) {
                    console.error('Erreur génération QR code KING:', qrError);
                    if (!responseSent) {
                        responseSent = true;
                        res.status(500).send({ code: 'Échec de génération du QR code' });
                    }
                }
            };

            // Improved Baileys socket configuration
            const socketConfig = {
                version,
                logger: pino({ level: 'silent' }),
                browser: Browsers.windows('Chrome'), // Using Browsers enum for better compatibility
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                markOnlineOnConnect: false, // Disable to reduce connection issues
                generateHighQualityLinkPreview: false, // Disable to reduce connection issues
                defaultQueryTimeoutMs: 60000, // Increase timeout
                connectTimeoutMs: 60000, // Increase connection timeout
                keepAliveIntervalMs: 30000, // Keep connection alive
                retryRequestDelayMs: 250, // Retry delay
                maxRetries: 5, // Maximum retries
            };

            // Create socket and bind events
            let sock = makeWASocket(socketConfig);
            let reconnectAttempts = 0;
            const maxReconnectAttempts = 3;

            // Connection event handler function
            const handleConnectionUpdate = async (update) => {
                const { connection, lastDisconnect, qr } = update;
                console.log(`🔄 Mise à jour connexion KING: ${connection || 'undefined'}`);

                if (qr && !qrGenerated) {
                    await handleQRCode(qr);
                }

                if (connection === 'open') {
                    console.log('✅ KING DIVIN Connecté avec succès!');
                    console.log('💾 Session sauvegardée dans:', dirs);
                    reconnectAttempts = 0; // Reset reconnect attempts on successful connection
                    
                    // Send session file to user 
                    try {
                        // Read the session file
                        const sessionData = fs.readFileSync(dirs + '/creds.json');
                        
                        // Get the user's JID from the session
                        const userJid = Object.keys(sock.authState.creds.me || {}).length > 0 
                            ? jidNormalizedUser(sock.authState.creds.me.id) 
                            : null;
                            
                        if (userJid) {
                            // Send session file to user
                            await sock.sendMessage(userJid, {
                                document: sessionData,
                                mimetype: 'application/json',
                                fileName: 'king_session.json'
                            });
                            console.log("📄 Session KING envoyée avec succès à", userJid);
                            
                            // Send KING image with caption
                            await sock.sendMessage(userJid, {
                                image: { url: KING_IMAGE_URL },
                                caption: `👑 *KING DIVIN - Légende Divine* 👑\n\nVotre session a été connectée avec succès !\n\nRejoignez le royaume :\n📢 Canal: https://whatsapp.com/channel/0029Vb6KikfLdQefJursHm20\n👥 Groupe: https://chat.whatsapp.com/GIIGfaym8V7DZZElf6C3Qh\n\n« Au stade le plus tragique et plus belle » ✨`
                            });
                            console.log("👑 Image KING envoyée avec succès");
                            
                            // Send KING message
                            await sock.sendMessage(userJid, {
                                text: `✅ *SESSION KING DIVIN CONNECTÉE* ✅\n\n👑 Créateur: Kervens King\n📞 Contact: 50942588377\n💻 GitHub: Kervens-King\n\n« Au stade le plus tragique et plus belle »`
                            });
                            
                            // Send warning message
                            await sock.sendMessage(userJid, {
                                text: `⚠️ *ATTENTION - SESSION KING DIVIN* ⚠️\n\nNe partagez PAS ce fichier avec qui que ce soit !\nCette session contient vos accès personnels.\n\n👑 Gardez-la en sécurité !\n\n© 2024 KING DIVIN`
                            });
                            console.log("⚠️ Message d'avertissement KING envoyé");
                        } else {
                            console.log("❌ Impossible de déterminer le JID utilisateur pour envoyer la session");
                        }
                    } catch (error) {
                        console.error("Erreur envoi session KING:", error);
                    }
                    
                    // Clean up session after successful connection and sending files
                    setTimeout(() => {
                        console.log('🧹 Nettoyage session KING...');
                        const deleted = removeFile(dirs);
                        if (deleted) {
                            console.log('✅ Session KING nettoyée avec succès');
                        } else {
                            console.log('❌ Échec nettoyage session KING');
                        }
                    }, 15000); // Wait 15 seconds before cleanup to ensure messages are sent
                }

                if (connection === 'close') {
                    console.log('❌ Connexion KING fermée');
                    if (lastDisconnect?.error) {
                        console.log('❗ Erreur déconnexion KING:', lastDisconnect.error);
                    }
                    
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    
                    // Handle specific error codes
                    if (statusCode === 401) {
                        console.log('🔐 Déconnecté - besoin nouveau QR code');
                        removeFile(dirs);
                    } else if (statusCode === 515 || statusCode === 503) {
                        console.log(`🔄 Erreur stream (${statusCode}) - tentative reconnexion...`);
                        reconnectAttempts++;
                        
                        if (reconnectAttempts <= maxReconnectAttempts) {
                            console.log(`🔄 Tentative reconnexion ${reconnectAttempts}/${maxReconnectAttempts}`);
                            // Wait a bit before reconnecting
                            setTimeout(() => {
                                try {
                                    sock = makeWASocket(socketConfig);
                                    sock.ev.on('connection.update', handleConnectionUpdate);
                                    sock.ev.on('creds.update', saveCreds);
                                } catch (err) {
                                    console.error('Échec reconnexion KING:', err);
                                }
                            }, 2000);
                        } else {
                            console.log('❌ Maximum tentatives reconnexion atteint');
                            if (!responseSent) {
                                responseSent = true;
                                res.status(503).send({ code: 'Échec connexion après multiples tentatives' });
                            }
                        }
                    } else {
                        console.log('🔄 Connexion perdue - tentative reconnexion...');
                        // Let it reconnect automatically
                    }
                }
            };

            // Bind the event handler
            sock.ev.on('connection.update', handleConnectionUpdate);

            sock.ev.on('creds.update', saveCreds);

            // Set a timeout to clean up if no QR is generated
            setTimeout(() => {
                if (!responseSent) {
                    responseSent = true;
                    res.status(408).send({ code: 'Timeout génération QR code' });
                    removeFile(dirs);
                }
            }, 30000); // 30 second timeout

        } catch (err) {
            console.error('Erreur initialisation session KING:', err);
            if (!res.headersSent) {
                res.status(503).send({ code: 'Service KING Indisponible' });
            }
            removeFile(dirs);
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
    console.log('Exception KING: ', err);
});

export default router;
