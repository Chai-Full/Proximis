import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialiser Firebase Admin SDK (côté serveur uniquement)
if (!getApps().length) {
  try {
    // Utiliser les variables d'environnement
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Variables Firebase Admin manquantes dans .env.local');
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error) {
    console.error('Erreur initialisation Firebase Admin:', error);
    throw error;
  }
}

const adminAuth = getAuth();

/**
 * Vérifie le token Firebase et retourne l'utilisateur Prisma
 */
export async function verifyAuth(req: NextRequest) {
  try {
    // Récupérer le token depuis le header Authorization
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, error: 'Token manquant' };
    }

    const token = authHeader.split('Bearer ')[1];

    // Vérifier le token avec Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(token);
    const email = decodedToken.email;

    if (!email) {
      return { user: null, error: 'Email non trouvé dans le token' };
    }

    // Récupérer l'utilisateur depuis Prisma
    const user = await prisma.user.findUnique({
      where: { mailUser: email },
    });

    if (!user) {
      return { user: null, error: 'Utilisateur non trouvé' };
    }

    return { user, error: null };
  } catch (error: any) {
    console.error('Erreur vérification auth:', error);
    return { user: null, error: 'Token invalide ou expiré' };
  }
}

/**
 * Middleware pour protéger les routes API
 */
export async function requireAuth(req: NextRequest) {
  const { user, error } = await verifyAuth(req);
  
  if (!user) {
    return { user: null, error: error || 'Non authentifié' };
  }
  
  return { user, error: null };
}

