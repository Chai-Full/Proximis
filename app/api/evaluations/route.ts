import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../lib/mongodb';
import { requireAuth } from '@/app/lib/auth';

type EvaluationBody = {
  reservationId: number | string;
  announcementId: number | string;
  rating: number;
  comment: string;
  userId?: number | string | null;
};

/**
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - reservationId
              - announcementId
              - rating
              - comment
            properties:
              reservationId:
                type: string
                description: ID of the reservation being evaluated
              announcementId:
                type: string
                description: ID of the announcement
              rating:
                type: integer
                minimum: 1
                maximum: 5
                description: Rating from 1 to 5
              comment:
                type: string
                description: Textual comment (required, cannot be empty)
              userId:
                type: string
                description: (optional) ID of the user submitting the evaluation — ignored by the server; reviewer is taken from the authenticated token
 *               comment:
 *                 type: string
 *                 description: Textual comment (required, cannot be empty)
 *               userId:
 *                 type: string
 *                 description: ID of the user submitting the evaluation
 *     responses:
 *       200:
 *         description: Evaluation saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 evaluation:
 *                   type: object
 *       400:
 *         description: Invalid payload or validation error
 *       500:
 *         description: Server error
 */
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await req.json()) as EvaluationBody;

    if (!body || !body.reservationId || !body.announcementId || !body.rating || !body.comment) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Validate rating (1-5)
    if (body.rating < 1 || body.rating > 5 || !Number.isInteger(body.rating)) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
    }

    // Validate comment is not empty
    if (!body.comment.trim()) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
    }

    const db = await getDb();

    // Verify announcement exists
    const announcementDoc = await db.collection('announcements').findOne({ id: Number(body.announcementId) });
    if (!announcementDoc) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 400 });
    }
    const evaluatedUserId = Number(announcementDoc.userId); // Owner of the announcement (receives the evaluation)
    const reviewerId = user.userId; // User who writes the review

    // Check if evaluation already exists for this reservation
    const existingEvaluation = await db.collection('evaluations').findOne({
      reservationId: Number(body.reservationId),
    });

    if (existingEvaluation) {
      // Evaluation already exists - cannot evaluate twice
      return NextResponse.json({ 
        ok: false, 
        error: 'Cette réservation a déjà été évaluée' 
      }, { status: 400 });
    }

    // Create new evaluation
    const newEvaluation = {
      id: Date.now(),
      reservationId: Number(body.reservationId),
      announcementId: Number(body.announcementId),
      // `userId` is the user who wrote the review (reviewer)
      userId: reviewerId,
      // Store who receives the evaluation (announcement owner)
      evaluatedUserId: evaluatedUserId,
      // Also keep reviewerId for backward compatibility
      reviewerId: reviewerId,
      rating: body.rating,
      comment: body.comment.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.collection('evaluations').insertOne(newEvaluation);
    const savedEvaluation = newEvaluation;

    // Update reservation status to "completed" after evaluation is saved
    try {
      await db.collection('reservations').updateOne(
        { id: Number(body.reservationId) },
        {
          $set: {
            status: 'completed',
            updatedAt: new Date().toISOString(),
          },
        }
      );
    } catch (err) {
      // Log error but don't fail the evaluation save
      console.error('Error updating reservation status after evaluation:', err);
    }

    return NextResponse.json({ 
      ok: true, 
      evaluation: savedEvaluation 
    });
  } catch (err) {
    console.error('Error saving evaluation', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/evaluations:
 *   get:
 *     tags:
 *       - Evaluations
 *     summary: Get evaluations
 *     description: Retrieve evaluations with optional filters
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: reservationId
 *         schema:
 *           type: string
 *         description: Filter by reservation ID
 *       - in: query
 *         name: announcementId
 *         schema:
 *           type: string
 *         description: Filter by announcement ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *     responses:
 *       200:
 *         description: List of evaluations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 evaluations:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Server error
 */
export async function GET(req: NextRequest) {
  try {
    // Allow public read access to evaluations (no auth required for GET)
    // This enables showing ratings on announcement cards without login
    const url = new URL(req.url);
    const reservationId = url.searchParams.get('reservationId');
    const announcementId = url.searchParams.get('announcementId');
    const userId = url.searchParams.get('userId');
    const evaluatedUserId = url.searchParams.get('evaluatedUserId');

    const db = await getDb();

    // Build query
    const query: any = {};
    if (reservationId) query.reservationId = Number(reservationId);
    if (announcementId) query.announcementId = Number(announcementId);
    if (userId) query.userId = Number(userId);
    if (evaluatedUserId) query.evaluatedUserId = Number(evaluatedUserId);

    const evaluations = await db.collection('evaluations').find(query).toArray();

    // Enrich evaluations with user information (reviewer) and announcement information
    const enrichedEvaluations = await Promise.all(
      evaluations.map(async (evaluation: any) => {
        const enriched: any = { ...evaluation };

        // Get reviewer (user who wrote the review) information
        let reviewerIdToUse: number | string | null = null;

        // userId now represents the reviewer (user who wrote the review)
        if (evaluation.userId) {
          reviewerIdToUse = evaluation.userId;
        }
        // Fallback: try reviewerId for backward compatibility
        else if (evaluation.reviewerId) {
          reviewerIdToUse = evaluation.reviewerId;
        } 
        // Last fallback: try to get reviewerId from the reservation
        // The reservation's userId is the client who made the reservation (and wrote the review)
        else if (evaluation.reservationId) {
          const reservation = await db.collection('reservations').findOne({
            $or: [
              { id: Number(evaluation.reservationId) },
              { id: String(evaluation.reservationId) },
            ],
          });
          if (reservation && reservation.userId) {
            reviewerIdToUse = reservation.userId;
          }
        }

        // Now fetch the reviewer user information
        if (reviewerIdToUse) {
          const reviewer = await db.collection('users').findOne({
            $or: [
              { id: Number(reviewerIdToUse) },
              { id: String(reviewerIdToUse) },
            ],
          });
          if (reviewer) {
            const prenom = reviewer.prenom || '';
            const nom = reviewer.nom || '';
            
            // Include reviewer information with direct access to name and surname
            enriched.reviewer = {
              id: reviewer.id,
              prenom: prenom,
              nom: nom,
              name: reviewer.name || '',
              email: reviewer.email || '',
            };
            
            // Also include directly accessible name fields at root level
            enriched.reviewerPrenom = prenom;
            enriched.reviewerNom = nom;
            
            // Format reviewer name for display
            if (prenom && nom) {
              enriched.reviewerName = `${prenom} ${nom.charAt(0).toUpperCase()}.`;
            } else if (prenom) {
              enriched.reviewerName = prenom;
            } else if (nom) {
              enriched.reviewerName = `${nom.charAt(0).toUpperCase()}.`;
            } else if (reviewer.email) {
              const emailName = reviewer.email.split('@')[0];
              enriched.reviewerName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
            } else {
              enriched.reviewerName = 'Utilisateur';
            }
          } else {
            enriched.reviewerName = 'Utilisateur';
            enriched.reviewer = null;
            enriched.reviewerPrenom = '';
            enriched.reviewerNom = '';
          }
        } else {
          enriched.reviewerName = 'Utilisateur';
          enriched.reviewer = null;
        }

        // Get announcement information (category) if announcementId is present
        if (evaluation.announcementId) {
          const announcement = await db.collection('announcements').findOne({
            $or: [
              { id: Number(evaluation.announcementId) },
              { id: String(evaluation.announcementId) },
            ],
          });
          if (announcement) {
            enriched.announcement = {
              id: announcement.id,
              category: announcement.category || announcement.typeAnnonce || '',
            };
          }
        }

        return enriched;
      })
    );

    return NextResponse.json({ ok: true, count: enrichedEvaluations.length, evaluations: enrichedEvaluations });
  } catch (err) {
    console.error('Error reading evaluations', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

