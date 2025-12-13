import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

type EvaluationBody = {
  reservationId: number | string;
  announcementId: number | string;
  rating: number;
  comment: string;
  userId: number | string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EvaluationBody;
    
    if (!body || !body.reservationId || !body.announcementId || !body.rating || !body.comment || !body.userId) {
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

    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'evaluations.json');

    // Ensure data directory exists
    try {
      await fs.access(dataDir);
    } catch (e) {
      await fs.mkdir(dataDir, { recursive: true });
    }

    // Load existing evaluations
    let existing: any[] = [];
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(content);
      existing = Array.isArray(parsed?.evaluations) ? parsed.evaluations : Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      existing = [];
    }

    // Check if evaluation already exists for this reservation
    const existingEvaluationIndex = existing.findIndex(
      (e: any) => String(e.reservationId) === String(body.reservationId)
    );

    let savedEvaluation;
    if (existingEvaluationIndex !== -1) {
      // Update existing evaluation
      existing[existingEvaluationIndex] = {
        ...existing[existingEvaluationIndex],
        rating: body.rating,
        comment: body.comment.trim(),
        updatedAt: new Date().toISOString(),
      };
      savedEvaluation = existing[existingEvaluationIndex];
    } else {
      // Create new evaluation
      const newEvaluation = {
        id: Date.now(),
        reservationId: body.reservationId,
        announcementId: body.announcementId,
        userId: body.userId,
        rating: body.rating,
        comment: body.comment.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      existing.push(newEvaluation);
      savedEvaluation = newEvaluation;
    }

    const out = { evaluations: existing };
    await fs.writeFile(filePath, JSON.stringify(out, null, 2), 'utf8');

    // Update reservation status to "completed" after evaluation is saved
    try {
      const reservationsDir = path.join(process.cwd(), 'data');
      const reservationsPath = path.join(reservationsDir, 'reservations.json');
      
      let reservations: any[] = [];
      try {
        const reservationsContent = await fs.readFile(reservationsPath, 'utf8');
        const parsedReservations = JSON.parse(reservationsContent);
        reservations = Array.isArray(parsedReservations?.reservations) 
          ? parsedReservations.reservations 
          : Array.isArray(parsedReservations) 
          ? parsedReservations 
          : [];
      } catch (e) {
        // If file doesn't exist or is invalid, we can't update the reservation
        console.warn('Could not read reservations file to update status:', e);
      }

      // Find and update the reservation
      const reservationIndex = reservations.findIndex(
        (r: any) => String(r.id) === String(body.reservationId)
      );

      if (reservationIndex !== -1) {
        reservations[reservationIndex] = {
          ...reservations[reservationIndex],
          status: 'completed',
          updatedAt: new Date().toISOString(),
        };

        const reservationsOut = { reservations };
        await fs.writeFile(reservationsPath, JSON.stringify(reservationsOut, null, 2), 'utf8');
      } else {
        console.warn(`Reservation ${body.reservationId} not found for status update`);
      }
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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const reservationId = url.searchParams.get('reservationId');
    const announcementId = url.searchParams.get('announcementId');
    const userId = url.searchParams.get('userId');

    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'evaluations.json');

    let existing: any[] = [];
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(content);
      existing = Array.isArray(parsed?.evaluations) ? parsed.evaluations : Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      existing = [];
    }

    // Filter evaluations based on query parameters
    const matches = existing.filter((e: any) => {
      if (reservationId && String(e.reservationId) !== String(reservationId)) return false;
      if (announcementId && String(e.announcementId) !== String(announcementId)) return false;
      if (userId && String(e.userId) !== String(userId)) return false;
      return true;
    });

    return NextResponse.json({ ok: true, count: matches.length, evaluations: matches });
  } catch (err) {
    console.error('Error reading evaluations', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

