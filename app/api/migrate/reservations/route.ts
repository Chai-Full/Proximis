import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getDb } from '@/app/lib/mongodb';

/**
 * @swagger
 * /api/migrate/reservations:
 *   post:
 *     tags:
 *       - Migration
 *     summary: Migrate reservations from JSON file to MongoDB
 *     description: Reads reservations from data/reservations.json and inserts them as individual documents in MongoDB
 *     responses:
 *       200:
 *         description: Migration completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     inserted:
 *                       type: number
 *                     skipped:
 *                       type: number
 *                     errors:
 *                       type: number
 *       500:
 *         description: Server error
 */
export async function POST() {
  try {
    const db = await getDb();
    const collection = db.collection('reservations');

    // Read the JSON file
    const filePath = path.join(process.cwd(), 'data', 'reservations.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    if (!data.reservations || !Array.isArray(data.reservations)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON structure. Expected { reservations: [...] }' },
        { status: 400 }
      );
    }

    const reservations = data.reservations;
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Process each reservation
    for (const reservation of reservations) {
      try {
        // Check if reservation with this id already exists
        const existing = await collection.findOne({ id: reservation.id });

        if (existing) {
          skipped++;
          continue;
        }

        // Insert as individual document
        await collection.insertOne(reservation);
        inserted++;
      } catch (err: any) {
        errors++;
        errorDetails.push(`Reservation ID ${reservation.id}: ${err.message}`);
        console.error(`Error inserting reservation ${reservation.id}:`, err);
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Migration completed',
      stats: {
        total: reservations.length,
        inserted,
        skipped,
        errors,
      },
      ...(errors > 0 && { errorDetails }),
    });
  } catch (err: any) {
    console.error('Migration error:', err);
    return NextResponse.json(
      { ok: false, error: `Migration failed: ${err.message}` },
      { status: 500 }
    );
  }
}

