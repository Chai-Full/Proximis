// Types pour les requêtes et réponses API

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Types pour les annonces
export interface CreateAnnonceInput {
  nomAnnonce: string;
  typeAnnonce: string;
  lieuAnnonce: string;
  prixAnnonce: number;
  descAnnonce?: string;
  photos?: string[];
  creneaux?: { dateDebut: string; dateFin: string }[];
}

export interface UpdateAnnonceInput extends Partial<CreateAnnonceInput> {}

// Types pour les réservations
export interface CreateReservationInput {
  annonceId: number;
  dateDebut: string;
  dateFin: string;
}

// Types pour les avis
export interface CreateAvisInput {
  noteAvis: number;
  commentaire?: string;
}

// Types pour les messages
export interface CreateMessageInput {
  conversationId: number;
  contenu: string;
}

// Types pour les conversations
export interface CreateConversationInput {
  annonceId: number;
  userId: number; // L'autre utilisateur
}

// Types pour les favoris
export interface CreateFavoriteInput {
  annonceId: number;
}

// Types pour le profil utilisateur
export interface UpdateUserInput {
  nomUser?: string;
  prenomUser?: string;
  photoUser?: string;
  modePrefUser?: string;
  perimPrefUser?: number;
}

