/**
 * Script de test pour vérifier la connexion MongoDB
 * Usage: node scripts/test-mongodb.js
 */

const { MongoClient } = require('mongodb');

const uri = process.env.NEXT_MONGODB_URI || 'mongodb://localhost:27017/proximis';

async function testConnection() {
  let client;
  try {
    console.log('🔌 Connexion à MongoDB...');
    console.log('URI:', uri.replace(/\/\/.*@/, '//***:***@')); // Masquer les credentials
    
    client = new MongoClient(uri);
    await client.connect();
    
    console.log('✅ Connexion réussie!');
    
    const db = client.db();
    const dbName = db.databaseName;
    console.log(`📊 Base de données: ${dbName}`);
    
    // Lister les collections
    const collections = await db.listCollections().toArray();
    console.log(`\n📁 Collections existantes (${collections.length}):`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    // Test des collections principales
    const mainCollections = ['users', 'announcements', 'reservations', 'evaluations', 'favorites', 'conversations', 'messages'];
    console.log('\n🔍 Vérification des collections principales:');
    
    for (const colName of mainCollections) {
      const count = await db.collection(colName).countDocuments();
      console.log(`   - ${colName}: ${count} document(s)`);
    }
    
    console.log('\n✅ Test MongoDB réussi!');
    
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error.message);
    console.error('\n💡 Vérifiez:');
    console.error('   1. Que MongoDB est démarré');
    console.error('   2. Que NEXT_MONGODB_URI est correctement configuré dans .env.local');
    console.error('   3. Que les credentials sont valides');
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Connexion fermée');
    }
  }
}

testConnection();

