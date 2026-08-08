import { getApp, getApps, initializeApp } from "firebase/app";

import { getAuth, signInAnonymously, type User } from "firebase/auth";

import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,

  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,

  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,

  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,

  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,

  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const auth = getAuth(app);

export async function ensurePublicUser(): Promise<User> {
  await auth.authStateReady();

  if (auth.currentUser) {
    return auth.currentUser;
  }

  const credential = await signInAnonymously(auth);

  return credential.user;
}

export async function verifyAdminSession(user: User): Promise<boolean> {
  if (user.isAnonymous) {
    return false;
  }

  try {
    const idToken = await user.getIdToken();

    const response = await fetch("/api/admin/verify", {
      method: "GET",

      headers: {
        Authorization: `Bearer ${idToken}`,
      },

      cache: "no-store",
    });

    return response.ok;
  } catch (error) {
    console.error("Admin session verification error:", error);

    return false;
  }
}
