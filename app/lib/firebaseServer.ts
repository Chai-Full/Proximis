// Configuration Firebase côté serveur
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

// Initialiser Firebase côté serveur avec les variables d'environnement
if (!getApps().length) {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  };

  // Vérifier que toutes les variables sont présentes
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    throw new Error(
      'Variables Firebase manquantes dans .env.local:\n' +
      '- NEXT_PUBLIC_FIREBASE_API_KEY\n' +
      '- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN\n' +
      '- NEXT_PUBLIC_FIREBASE_PROJECT_ID'
    );
  }

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
}

export { auth };

