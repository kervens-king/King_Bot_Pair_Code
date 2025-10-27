import * as mega from 'megajs';

// Identifiants d'authentification Mega
const auth = {
    email: 'abc@gmail.com', // Remplacez par votre email Mega
    password: 'abc@1234!', // Remplacez par votre mot de passe Mega
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246'
};

// Fonction pour uploader un fichier vers Mega et retourner l'URL
export const upload = (data, name) => {
    return new Promise((resolve, reject) => {
        try {
            // Authentification avec le stockage Mega
            const storage = new mega.Storage(auth, () => {
                // Upload du flux de données (ex: flux de fichier) vers Mega
                const uploadStream = storage.upload({ name: name, allowUploadBuffering: true });

                // Diriger les données vers Mega
                data.pipe(uploadStream);

                // Quand le fichier est uploadé avec succès, résoudre avec l'URL du fichier
                storage.on("add", (file) => {
                    file.link((err, url) => {
                        if (err) {
                            reject(err); // Rejeter en cas d'erreur pour obtenir le lien
                        } else {
                            storage.close(); // Fermer la session de stockage une fois le fichier uploadé
                            resolve(url); // Retourner le lien du fichier
                        }
                    });
                });

                // Gérer les erreurs pendant le processus d'upload
                storage.on("error", (error) => {
                    reject(error);
                });
            });
        } catch (err) {
            reject(err); // Rejeter si une erreur survient pendant le processus d'upload
        }
    });
};

// Fonction pour télécharger un fichier depuis Mega en utilisant une URL
export const download = (url) => {
    return new Promise((resolve, reject) => {
        try {
            // Obtenir le fichier depuis Mega en utilisant l'URL
            const file = mega.File.fromURL(url);

            file.loadAttributes((err) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Télécharger le buffer du fichier
                file.downloadBuffer((err, buffer) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(buffer); // Retourner le buffer du fichier
                    }
                });
            });
        } catch (err) {
            reject(err);
        }
    });
};
