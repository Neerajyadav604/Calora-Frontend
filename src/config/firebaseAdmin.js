const admin = require('firebase-admin');

const parsePrivateKey = (value) => {
  if (!value) return undefined;
  return value.replace(/\\n/g, '\n');
};

if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (serviceAccountJson) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
    });
  } else if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    admin.initializeApp();
  }
}

module.exports = admin;
