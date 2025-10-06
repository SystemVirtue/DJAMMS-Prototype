// scripts/create-test-user.js
// Uses Appwrite JS SDK v13.0.2
// Creates or updates a test user document in the 'users' collection with email 'admin@djamms.app' and role 'owner'.

// Load environment variables from .env
require('dotenv').config();

const { Client, Databases, ID, Query } = require('appwrite');

async function main() {
  const endpoint = process.env.VITE_APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT;
  const project = process.env.VITE_APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID;

  if (!endpoint || !project || !databaseId) {
    console.error('Missing required .env variables. Please set VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, and VITE_APPWRITE_DATABASE_ID (or APPWRITE_* equivalents).');
    process.exit(1);
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(project);

  const databases = new Databases(client);

  const email = 'admin@djamms.app';
  const role = 'owner';

  try {
    // Query for existing user document by email
    const res = await databases.listDocuments(databaseId, 'users', [Query.equal('email', email)]);

    if (res.documents && res.documents.length > 0) {
      const doc = res.documents[0];
      const docId = doc.$id;
      // Update role field
      await databases.updateDocument(databaseId, 'users', docId, {
        email: email,
        role: role,
        updatedAt: new Date().toISOString(),
      });
      console.log(`Updated existing user document (id=${docId}) with role='${role}'.`);
    } else {
      // Create new user document
      const created = await databases.createDocument(databaseId, 'users', ID.unique(), {
        email: email,
        role: role,
        createdAt: new Date().toISOString(),
      });
      console.log(`Created new user document (id=${created.$id}) with email='${email}' and role='${role}'.`);
    }
  } catch (error) {
    console.error('Error creating/updating test user:', error);
    process.exitCode = 2;
  }
}

// Execute main
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exitCode = 2;
});
