import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../lib/mongodb';
import { requireAuth } from '@/app/lib/auth';

type CreateConversationBody = {
  fromUserId: number | string;
  toUserId: number | string;
  announcementId: number | string;
  reservationId?: number | string;
  initialMessage: string;
};

/**
 * @swagger
 * /api/conversations:
 *   post:
 *     tags:
 *       - Conversations
 *     summary: Create a new conversation
 *     description: Create a new conversation with an initial message
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromUserId
 *               - toUserId
 *               - announcementId
 *               - initialMessage
 *             properties:
 *               fromUserId:
 *                 type: string
 *               toUserId:
 *                 type: string
 *               announcementId:
 *                 type: string
 *               reservationId:
 *                 type: string
 *               initialMessage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Conversation created successfully
 *       400:
 *         description: Invalid payload
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

    const body = (await req.json()) as CreateConversationBody;
    if (!body || !body.fromUserId || !body.toUserId || !body.announcementId || !body.initialMessage) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const db = await getDb();

    // Generate conversation ID (combination of user IDs and announcement ID)
    const conversationId = `conv_${body.fromUserId}_${body.toUserId}_${body.announcementId}`;

    // Check if conversation already exists
    let conversation: any = await db.collection('conversations').findOne({
      id: conversationId,
    });

    if (!conversation) {
      // Create new conversation
      conversation = {
        id: conversationId,
        fromUserId: Number(body.fromUserId),
        toUserId: Number(body.toUserId),
        announcementId: Number(body.announcementId),
        reservationId: body.reservationId ? Number(body.reservationId) : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.collection('conversations').insertOne(conversation as any);
    } else {
      // Update existing conversation
      await db.collection('conversations').updateOne(
        { id: conversationId },
        {
          $set: {
            updatedAt: new Date().toISOString(),
            ...(body.reservationId && { reservationId: Number(body.reservationId) }),
          },
        }
      );
      conversation = await db.collection('conversations').findOne({ id: conversationId }) as any;
    }

    // Create initial message
    const messageId = `msg_${Date.now()}`;
    const message = {
      id: messageId,
      conversationId: conversationId,
      fromUserId: Number(body.fromUserId),
      toUserId: Number(body.toUserId),
      text: body.initialMessage,
      createdAt: new Date().toISOString(),
      read: false,
    };

    await db.collection('messages').insertOne(message);

    return NextResponse.json({ ok: true, conversation, message });
  } catch (err) {
    console.error('Error creating conversation/message', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/conversations:
 *   get:
 *     tags:
 *       - Conversations
 *     summary: Get conversations
 *     description: Retrieve conversations with optional filters
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID (fromUserId or toUserId)
 *       - in: query
 *         name: conversationId
 *         schema:
 *           type: string
 *         description: Get specific conversation with messages
 *     responses:
 *       200:
 *         description: List of conversations and messages
 *       404:
 *         description: Conversation not found
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

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const conversationId = url.searchParams.get('conversationId');

    const db = await getDb();

    if (conversationId) {
      // Get specific conversation with its messages
      const conversation = await db.collection('conversations').findOne({
        id: conversationId,
      });

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      // Enrich conversation with announcement details, user information, and reservation details
      const enriched: any = { ...conversation };
      if (conversation.announcementId) {
        const announcement = await db.collection('announcements').findOne({
          $or: [
            { id: Number(conversation.announcementId) },
            { id: String(conversation.announcementId) },
          ],
        });
        
        if (announcement) {
          enriched.announcement = {
            id: announcement.id,
            title: announcement.title || announcement.nomAnnonce || '',
            category: announcement.category || announcement.typeAnnonce || '',
            photo: announcement.photo || announcement.photos?.[0]?.urlPhoto || null,
            scope: announcement.scope || announcement.lieuAnnonce || null,
            slots: announcement.slots || announcement.creneaux || [],
            userId: announcement.userId || announcement.userCreateur || announcement.userCreateur?.idUser || null,
          };
          
          // Get announcement owner details
          const announcementOwnerId = announcement.userId || announcement.userCreateur || announcement.userCreateur?.idUser;
          if (announcementOwnerId) {
            const owner = await db.collection('users').findOne({
              $or: [
                { id: Number(announcementOwnerId) },
                { id: String(announcementOwnerId) },
              ],
            });
            
            if (owner) {
              enriched.announcementOwner = {
                id: owner.id,
                prenom: owner.prenom || '',
                nom: owner.nom || '',
                name: owner.name || '',
                email: owner.email || '',
                photo: owner.photo || null,
                adresse: owner.adresse || '',
                codePostal: owner.codePostal || '',
                ville: owner.ville || '',
                pays: owner.pays || '',
                latitude: owner.latitude || owner.lat || owner.position?.lat || null,
                longitude: owner.longitude || owner.lng || owner.position?.lng || null,
              };
            }
          }
        }
      }
      
      // Get fromUser details
      if (conversation.fromUserId) {
        const fromUser = await db.collection('users').findOne({
          $or: [
            { id: Number(conversation.fromUserId) },
            { id: String(conversation.fromUserId) },
          ],
        });
        
        if (fromUser) {
          enriched.fromUser = {
            id: fromUser.id,
            prenom: fromUser.prenom || '',
            nom: fromUser.nom || '',
            name: fromUser.name || '',
            email: fromUser.email || '',
            photo: fromUser.photo || null,
            adresse: fromUser.adresse || '',
            codePostal: fromUser.codePostal || '',
            ville: fromUser.ville || '',
            pays: fromUser.pays || '',
            latitude: fromUser.latitude || fromUser.lat || fromUser.position?.lat || null,
            longitude: fromUser.longitude || fromUser.lng || fromUser.position?.lng || null,
          };
        }
      }
      
      // Get toUser details
      if (conversation.toUserId) {
        const toUser = await db.collection('users').findOne({
          $or: [
            { id: Number(conversation.toUserId) },
            { id: String(conversation.toUserId) },
          ],
        });
        
        if (toUser) {
          enriched.toUser = {
            id: toUser.id,
            prenom: toUser.prenom || '',
            nom: toUser.nom || '',
            name: toUser.name || '',
            email: toUser.email || '',
            photo: toUser.photo || null,
            adresse: toUser.adresse || '',
            codePostal: toUser.codePostal || '',
            ville: toUser.ville || '',
            pays: toUser.pays || '',
            latitude: toUser.latitude || toUser.lat || toUser.position?.lat || null,
            longitude: toUser.longitude || toUser.lng || toUser.position?.lng || null,
          };
        }
      }
      
      // Get reservation details if exists
      if (conversation.reservationId) {
        const reservation = await db.collection('reservations').findOne({
          $or: [
            { id: Number(conversation.reservationId) },
            { id: String(conversation.reservationId) },
          ],
        });
        
        if (reservation) {
          enriched.reservation = {
            id: reservation.id,
            date: reservation.date || null,
            slotIndex: reservation.slotIndex || null,
            status: reservation.status || 'reserved',
          };
        }
      }

      const messages = await db.collection('messages')
        .find({ conversationId })
        .sort({ createdAt: 1 })
        .toArray();

      return NextResponse.json({ ok: true, conversation: enriched, messages });
    }

    if (userId) {
      // Get all conversations for a user
      const userIdNum = Number(userId);
      console.log('Searching conversations for userId:', userIdNum);
      
      const userConversations = await db.collection('conversations')
        .find({
          $or: [
            { fromUserId: userIdNum },
            { toUserId: userIdNum },
          ],
        })
        .toArray();

      console.log('Found conversations:', userConversations.length, userConversations);

      // Enrich conversations with announcement details, user information, and reservation details
      const enrichedConversations = await Promise.all(
        userConversations.map(async (conv: any) => {
          const enriched: any = { ...conv };
          
          // Get announcement details
          if (conv.announcementId) {
            const announcement = await db.collection('announcements').findOne({
              $or: [
                { id: Number(conv.announcementId) },
                { id: String(conv.announcementId) },
              ],
            });
            
            if (announcement) {
              enriched.announcement = {
                id: announcement.id,
                title: announcement.title || announcement.nomAnnonce || '',
                category: announcement.category || announcement.typeAnnonce || '',
                photo: announcement.photo || announcement.photos?.[0]?.urlPhoto || null,
                scope: announcement.scope || announcement.lieuAnnonce || null,
                slots: announcement.slots || announcement.creneaux || [],
                userId: announcement.userId || announcement.userCreateur || announcement.userCreateur?.idUser || null,
              };
              
              // Get announcement owner details
              const announcementOwnerId = announcement.userId || announcement.userCreateur || announcement.userCreateur?.idUser;
              if (announcementOwnerId) {
                const owner = await db.collection('users').findOne({
                  $or: [
                    { id: Number(announcementOwnerId) },
                    { id: String(announcementOwnerId) },
                  ],
                });
                
                if (owner) {
                  enriched.announcementOwner = {
                    id: owner.id,
                    prenom: owner.prenom || '',
                    nom: owner.nom || '',
                    name: owner.name || '',
                    email: owner.email || '',
                    photo: owner.photo || null,
                    adresse: owner.adresse || '',
                    codePostal: owner.codePostal || '',
                    ville: owner.ville || '',
                    pays: owner.pays || '',
                    latitude: owner.latitude || owner.lat || owner.position?.lat || null,
                    longitude: owner.longitude || owner.lng || owner.position?.lng || null,
                  };
                }
              }
            }
          }
          
          // Get fromUser details
          if (conv.fromUserId) {
            const fromUser = await db.collection('users').findOne({
              $or: [
                { id: Number(conv.fromUserId) },
                { id: String(conv.fromUserId) },
              ],
            });
            
            if (fromUser) {
              enriched.fromUser = {
                id: fromUser.id,
                prenom: fromUser.prenom || '',
                nom: fromUser.nom || '',
                name: fromUser.name || '',
                email: fromUser.email || '',
                photo: fromUser.photo || null,
              };
            }
          }
          
          // Get toUser details
          if (conv.toUserId) {
            const toUser = await db.collection('users').findOne({
              $or: [
                { id: Number(conv.toUserId) },
                { id: String(conv.toUserId) },
              ],
            });
            
            if (toUser) {
              enriched.toUser = {
                id: toUser.id,
                prenom: toUser.prenom || '',
                nom: toUser.nom || '',
                name: toUser.name || '',
                email: toUser.email || '',
                photo: toUser.photo || null,
              };
            }
          }
          
          // Get reservation details if exists
          if (conv.reservationId) {
            const reservation = await db.collection('reservations').findOne({
              $or: [
                { id: Number(conv.reservationId) },
                { id: String(conv.reservationId) },
              ],
            });
            
            if (reservation) {
              enriched.reservation = {
                id: reservation.id,
                date: reservation.date || null,
                slotIndex: reservation.slotIndex || null,
                status: reservation.status || 'reserved',
              };
            }
          }
          
          return enriched;
        })
      );

      // Get messages for these conversations
      const conversationIds = enrichedConversations.map((c: any) => c.id);
      const userMessages = await db.collection('messages')
        .find({ conversationId: { $in: conversationIds } })
        .sort({ createdAt: 1 })
        .toArray();

      console.log('Found messages:', userMessages.length);

      return NextResponse.json({ ok: true, conversations: enrichedConversations, messages: userMessages });
    }

    // Get all conversations and messages
    const conversations = await db.collection('conversations').find({}).toArray();
    
    // Enrich conversations with announcement details, user information, and reservation details
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv: any) => {
        const enriched: any = { ...conv };
        
        // Get announcement details
        if (conv.announcementId) {
          const announcement = await db.collection('announcements').findOne({
            $or: [
              { id: Number(conv.announcementId) },
              { id: String(conv.announcementId) },
            ],
          });
          
          if (announcement) {
            enriched.announcement = {
              id: announcement.id,
              title: announcement.title || announcement.nomAnnonce || '',
              category: announcement.category || announcement.typeAnnonce || '',
              photo: announcement.photo || announcement.photos?.[0]?.urlPhoto || null,
              scope: announcement.scope || announcement.lieuAnnonce || null,
              slots: announcement.slots || announcement.creneaux || [],
            };
          }
        }
        
        // Get fromUser details
        if (conv.fromUserId) {
          const fromUser = await db.collection('users').findOne({
            $or: [
              { id: Number(conv.fromUserId) },
              { id: String(conv.fromUserId) },
            ],
          });
          
          if (fromUser) {
            enriched.fromUser = {
              id: fromUser.id,
              prenom: fromUser.prenom || '',
              nom: fromUser.nom || '',
              name: fromUser.name || '',
              email: fromUser.email || '',
              photo: fromUser.photo || null,
            };
          }
        }
        
        // Get toUser details
        if (conv.toUserId) {
          const toUser = await db.collection('users').findOne({
            $or: [
              { id: Number(conv.toUserId) },
              { id: String(conv.toUserId) },
            ],
          });
          
          if (toUser) {
            enriched.toUser = {
              id: toUser.id,
              prenom: toUser.prenom || '',
              nom: toUser.nom || '',
              name: toUser.name || '',
              email: toUser.email || '',
              photo: toUser.photo || null,
            };
          }
        }
        
        // Get reservation details if exists
        if (conv.reservationId) {
          const reservation = await db.collection('reservations').findOne({
            $or: [
              { id: Number(conv.reservationId) },
              { id: String(conv.reservationId) },
            ],
          });
          
          if (reservation) {
            enriched.reservation = {
              id: reservation.id,
              date: reservation.date || null,
              slotIndex: reservation.slotIndex || null,
              status: reservation.status || 'reserved',
            };
          }
        }
        
        return enriched;
      })
    );
    
    const messages = await db.collection('messages').find({}).sort({ createdAt: 1 }).toArray();

    return NextResponse.json({ ok: true, conversations: enrichedConversations, messages });
  } catch (err) {
    console.error('Error reading conversations/messages', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
