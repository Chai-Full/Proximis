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

    // Determine which user should receive the evaluation: the owner of the announcement
    const announcementDoc = await db.collection('announcements').findOne({ id: Number(body.announcementId) });
    if (!announcementDoc) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 400 });
    }
    const evaluatedUserId = Number(announcementDoc.userId);
    const reviewerId = user.userId;

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
      // `userId` is the user receiving the evaluation (announcement owner)
      userId: evaluatedUserId,
      // store who made the evaluation
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

    const db = await getDb();

    // Build query
    const query: any = {};
    if (reservationId) query.reservationId = Number(reservationId);
    if (announcementId) query.announcementId = Number(announcementId);
    if (userId) query.userId = Number(userId);

    const evaluations = await db.collection('evaluations').find(query).toArray();

    return NextResponse.json({ ok: true, count: evaluations.length, evaluations });
  } catch (err) {
    console.error('Error reading evaluations', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

