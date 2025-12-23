import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth';
import fs from 'fs';
import path from 'path';

/**
 * @swagger
 * /api/categories:
 *   get:
 *     tags:
 *       - Categories
 *     summary: Get all categories
 *     description: Retrieve all categories from categories.json
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const categoriesPath = path.join(process.cwd(), 'data', 'categories.json');
    const categoriesData = fs.readFileSync(categoriesPath, 'utf-8');
    const categories = JSON.parse(categoriesData);

    return NextResponse.json({
      ok: true,
      categories,
    });
  } catch (err: any) {
    console.error('Error loading categories:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

