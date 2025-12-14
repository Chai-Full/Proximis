import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/app/lib/mongodb';
import { requireAuth } from '@/app/lib/auth';
import fs from 'fs/promises';
import path from 'path';

/**
 * @swagger
 * /api/migrate/images:
 *   post:
 *     tags:
 *       - Migration
 *     summary: Migrate images from filesystem to MongoDB
 *     description: Convert existing images from public/uploads to base64 and store in MongoDB
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Migration completed successfully
 *       401:
 *         description: Unauthorized
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

    const db = await getDb();
    const results = {
      announcements: { processed: 0, updated: 0, errors: 0 },
      users: { processed: 0, updated: 0, errors: 0 },
    };

    // Migrate announcement images
    try {
      const announcements = await db.collection('announcements').find({}).toArray();
      
      for (const announcement of announcements) {
        results.announcements.processed++;
        
        if (announcement.photo && typeof announcement.photo === 'string') {
          // Check if it's already a base64 data URI
          if (announcement.photo.startsWith('data:')) {
            continue; // Already migrated
          }

          // Check if it's a local file path (starts with /uploads/)
          if (announcement.photo.startsWith('/uploads/')) {
            try {
              const filename = announcement.photo.replace('/uploads/', '');
              const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
              
              // Check if file exists
              try {
                await fs.access(filePath);
              } catch {
                console.warn(`File not found: ${filePath}, skipping...`);
                results.announcements.errors++;
                continue;
              }

              // Read file and convert to base64
              const fileBuffer = await fs.readFile(filePath);
              const base64String = fileBuffer.toString('base64');
              
              // Detect mime type from file extension
              const ext = path.extname(filename).toLowerCase();
              const mimeTypes: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
              };
              const mimeType = mimeTypes[ext] || 'image/jpeg';
              
              // Store as data URI
              const photoBase64 = `data:${mimeType};base64,${base64String}`;
              
              // Update announcement in MongoDB
              await db.collection('announcements').updateOne(
                { id: announcement.id },
                { $set: { photo: photoBase64 } }
              );
              
              results.announcements.updated++;
            } catch (err) {
              console.error(`Error migrating announcement ${announcement.id} image:`, err);
              results.announcements.errors++;
            }
          }
        }
      }
    } catch (err) {
      console.error('Error migrating announcement images:', err);
    }

    // Migrate user profile images
    try {
      const users = await db.collection('users').find({}).toArray();
      
      for (const userDoc of users) {
        results.users.processed++;
        
        if (userDoc.photo && typeof userDoc.photo === 'string') {
          // Check if it's already a base64 data URI
          if (userDoc.photo.startsWith('data:')) {
            continue; // Already migrated
          }

          // Check if it's a local file path (starts with /uploads/ or /photo)
          if (userDoc.photo.startsWith('/uploads/') || userDoc.photo.startsWith('/photo')) {
            try {
              // Handle different path formats
              let filename: string;
              if (userDoc.photo.startsWith('/uploads/')) {
                filename = userDoc.photo.replace('/uploads/', '');
              } else {
                filename = userDoc.photo.replace('/', '');
              }
              
              const filePath = path.join(process.cwd(), 'public', filename);
              
              // Check if file exists
              try {
                await fs.access(filePath);
              } catch {
                console.warn(`File not found: ${filePath}, skipping...`);
                results.users.errors++;
                continue;
              }

              // Read file and convert to base64
              const fileBuffer = await fs.readFile(filePath);
              const base64String = fileBuffer.toString('base64');
              
              // Detect mime type from file extension
              const ext = path.extname(filename).toLowerCase();
              const mimeTypes: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
              };
              const mimeType = mimeTypes[ext] || 'image/jpeg';
              
              // Store as data URI
              const photoBase64 = `data:${mimeType};base64,${base64String}`;
              
              // Update user in MongoDB
              await db.collection('users').updateOne(
                { id: userDoc.id },
                { $set: { photo: photoBase64 } }
              );
              
              results.users.updated++;
            } catch (err) {
              console.error(`Error migrating user ${userDoc.id} image:`, err);
              results.users.errors++;
            }
          }
        }
      }
    } catch (err) {
      console.error('Error migrating user images:', err);
    }

    return NextResponse.json({
      ok: true,
      message: 'Image migration completed',
      results,
    });
  } catch (err: any) {
    console.error('Error in image migration:', err);
    return NextResponse.json(
      { ok: false, error: 'Server error during migration' },
      { status: 500 }
    );
  }
}

