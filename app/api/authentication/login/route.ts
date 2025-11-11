import { NextRequest, NextResponse } from 'next/server';
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

    // Optionnel: tenter de créer l'utilisateur si non présent (ne doit pas bloquer le flow)
    try {
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
    } catch (e) {
      // Ne pas renvoyer 500: on ne bloque pas l'envoi du lien si la BDD n'est pas prête
      console.error('Login: erreur Prisma (ignorée pour le flow):', e);
    }

    // OK; l'envoi du lien se fait côté client
    return NextResponse.json({ message: 'OK' }, { status: 200 });
  } catch (error: any) {
    console.error('Erreur de login:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
  }
}
