import { NextRequest, NextResponse } from 'next/server';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { auth } from '@/app/lib/firebaseServer';
import { prisma } from '@/app/lib/prisma';

/**
 * @swagger
 * /api/authentication/login:
 *   post:
 *     tags:
 *       - Authentification
 *     summary: Envoie un lien magique à l'utilisateur pour se connecter.
 *     description: Utilise Firebase Authentication pour envoyer un lien magique à l'adresse e-mail fournie.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: utilisateur@test.com
 *     responses:
 *       200:
 *         description: Lien envoyé avec succès.
 *       400:
 *         description: Email manquant ou invalide.
 *       500:
 *         description: Erreur interne du serveur.
 */

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email manquant ou invalide' }, { status: 400 });
    }

    // Vérifier que Firebase est initialisé
    if (!auth) {
      return NextResponse.json(
        { error: 'Configuration Firebase manquante. Vérifiez vos variables d\'environnement.' },
        { status: 500 }
      );
    }

    // Configuration du lien magique
    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/verify?email=${encodeURIComponent(email)}`,
      handleCodeInApp: true,
    };

    // Envoyer le lien magique
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);

    // Si l’utilisateur n’existe pas encore, on l’ajoute à la BDD
    const existingUser = await prisma.user.findUnique({ where: { mailUser: email } });
    if (!existingUser) {
      await prisma.user.create({
        data: {
          mailUser: email,
          nomUser: '',
          prenomUser: '',
        },
      });
    }

    return NextResponse.json({ message: 'Lien magique envoyé à l’adresse e-mail.' }, { status: 200 });
  } catch (error: any) {
    console.error('Erreur de login:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
