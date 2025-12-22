import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/mongodb";
import { requireAuth } from "@/app/lib/auth";

/**
 * @swagger
 * /api/profile/{userId}:
 *   get:
 *     tags:
 *       - Profile
 *     summary: Get public profile information for a user
 *     description: Retrieve user profile information including stats (reviews count, average rating, announcements count)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: number
 *         description: User ID to get profile for
 *     responses:
 *       200:
 *         description: Profile information
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { user, error } = await requireAuth(req);
    if (!user) {
      return NextResponse.json(
        { ok: false, error: error || "Unauthorized" },
        { status: 401 }
      );
    }

    const { userId: userIdParam } = await params;
    const userId = Number(userIdParam);
    if (!Number.isFinite(userId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid userId" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Fetch user information
    const userDoc = await db.collection("users").findOne(
      {
        $or: [
          { id: userId },
          { id: String(userId) },
        ],
      },
      { projection: { _id: 0 } }
    );

    if (!userDoc) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Fetch user's announcements
    const userAnnouncements = await db
      .collection("announcements")
      .find(
        {
          $or: [
            { userId: userId },
            { userId: String(userId) },
            { userCreateur: userId },
            { userCreateur: String(userId) },
            { "userCreateur.idUser": userId },
            { "userCreateur.idUser": String(userId) },
          ],
        },
        { projection: { _id: 0, id: 1 } }
      )
      .toArray();

    const userAnnouncementIds = userAnnouncements.map((a: any) => a.id);

    // Fetch all evaluations for user's announcements
    const evaluations = await db
      .collection("evaluations")
      .find(
        {
          announcementId: { $in: userAnnouncementIds },
        },
        { projection: { _id: 0, rating: 1 } }
      )
      .toArray();

    // Calculate stats
    const reviewsCount = evaluations.length;
    let averageRating = 0;
    if (reviewsCount > 0) {
      const sum = evaluations.reduce(
        (acc: number, evaluation: any) => acc + (Number(evaluation.rating) || 0),
        0
      );
      averageRating = sum / reviewsCount;
    }

    const announcementsCount = userAnnouncements.length;

    // Return profile data
    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: userDoc.id,
          prenom: userDoc.prenom,
          nom: userDoc.nom,
          email: userDoc.email,
          photo: userDoc.photo,
          adresse: userDoc.adresse,
          codePostal: userDoc.codePostal,
          pays: userDoc.pays,
        },
        stats: {
          reviewsCount,
          averageRating,
          announcementsCount,
        },
      },
    });
  } catch (err: any) {
    console.error("Error getting profile:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}

