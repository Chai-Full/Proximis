# Migration MongoDB - Documentation

## Résumé des changements

Toutes les routes API ont été migrées de fichiers JSON vers MongoDB pour préparer l'application à la production.

## Configuration MongoDB

### Variables d'environnement requises

Ajoutez dans votre fichier `.env.local` :

```env
NEXT_MONGODB_URI=mongodb://localhost:27017/proximis
# ou pour MongoDB Atlas:
# NEXT_MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/proximis

NEXT_MONGODB_DB_NAME=proximis  # Optionnel, par défaut "proximis"
```

### Connexion MongoDB

Le fichier `app/lib/mongodb.ts` gère la connexion MongoDB avec :
- Support du mode développement (cache global)
- Support du mode production
- Utilisation de `NEXT_MONGODB_URI` pour la connexion

## Routes API migrées

### ✅ Routes complètement migrées avec Swagger

1. **`/api/evaluations`** (GET, POST)
   - Collections: `evaluations`, `reservations`
   - Documentation Swagger complète

2. **`/api/favorites`** (GET, POST, DELETE)
   - Collection: `favorites`
   - Documentation Swagger complète

3. **`/api/reservations`** (GET, POST, PUT)
   - Collection: `reservations`, `announcements`
   - Documentation Swagger complète
   - Mise à jour automatique du statut "reserved" → "to_evaluate"

4. **`/api/announcements`** (POST)
   - Collection: `announcements`
   - Support upload de photos
   - Documentation Swagger complète

5. **`/api/announcements/update`** (PUT)
   - Collection: `announcements`
   - Documentation Swagger complète

6. **`/api/users`** (GET)
   - Collection: `users`
   - Documentation Swagger complète

7. **`/api/register`** (POST)
   - Collection: `users`
   - Documentation Swagger complète

8. **`/api/profile`** (PUT)
   - Collection: `users`
   - Documentation Swagger complète

9. **`/api/messages`** (GET, POST)
   - Collections: `messages`, `conversations`
   - Documentation Swagger complète

10. **`/api/conversations`** (GET, POST)
    - Collections: `conversations`, `messages`
    - Documentation Swagger complète

## Documentation Swagger

### Accès à la documentation

La documentation Swagger est accessible via :
- **JSON**: `/api/docs` - Retourne le spec OpenAPI 3.0
- **UI Swagger**: À configurer avec un outil comme Swagger UI ou Redoc

### Configuration Swagger

Le fichier `app/lib/swagger.ts` configure Swagger avec :
- Titre: "Proximis Swagger API Documentation"
- Version: "1.0"
- Support Bearer Auth (JWT) pour l'authentification

## Collections MongoDB

Les collections utilisées sont :

1. **`users`** - Utilisateurs
2. **`announcements`** - Annonces
3. **`reservations`** - Réservations
4. **`evaluations`** - Évaluations/Avis
5. **`favorites`** - Favoris
6. **`conversations`** - Conversations
7. **`messages`** - Messages

## Structure des données

Les données conservent la même structure que les fichiers JSON précédents, avec l'ajout de :
- `_id`: ObjectId MongoDB (ajouté automatiquement)
- `createdAt`: Date ISO string
- `updatedAt`: Date ISO string (pour les mises à jour)

## Tests

Pour tester la connexion MongoDB :

1. Vérifiez que MongoDB est démarré
2. Vérifiez que `NEXT_MONGODB_URI` est configuré
3. Testez une route API (ex: `GET /api/users`)
4. Vérifiez la documentation Swagger: `GET /api/docs`

## Migration des données existantes

Pour migrer les données JSON existantes vers MongoDB :

1. Lisez les fichiers JSON dans `data/`
2. Utilisez un script de migration pour insérer dans MongoDB
3. Les routes API fonctionnent directement avec MongoDB

## Notes importantes

- Toutes les routes utilisent maintenant MongoDB uniquement
- Les fichiers JSON dans `data/` ne sont plus utilisés par les routes API
- La structure des données reste compatible avec l'interface frontend
- Les IDs numériques sont conservés pour la compatibilité

