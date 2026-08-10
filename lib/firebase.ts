import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

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

/**
 * =========================================================
 * ADMIN / DEFAULT FIREBASE APP
 * =========================================================
 *
 * Digunakan untuk:
 *
 * - Admin authentication
 * - Admin Firestore
 * - Public Firestore operations yang memang no-auth
 */

const defaultApp =
  getApps().find((firebaseApp) => firebaseApp.name === "[DEFAULT]") ??
  initializeApp(firebaseConfig);

export const auth = getAuth(defaultApp);

export const db = getFirestore(defaultApp);

/**
 * =========================================================
 * TEMPORARY PUBLIC AUTH APP
 * =========================================================
 *
 * HANYA untuk Wall dan Capsule versi lama.
 *
 * Ini sengaja dipisahkan dari admin auth supaya
 * Anonymous Auth tidak pernah mengganti session admin.
 *
 * Setelah Wall + Capsule selesai dimigrasikan ke no-auth,
 * seluruh bagian ini akan kita hapus.
 */

const PUBLIC_APP_NAME = "the-archive-public-legacy";

function getPublicApp(): FirebaseApp {
  const existingApp = getApps().find(
    (firebaseApp) => firebaseApp.name === PUBLIC_APP_NAME,
  );

  if (existingApp) {
    return existingApp;
  }

  return initializeApp(firebaseConfig, PUBLIC_APP_NAME);
}

const publicApp = getPublicApp();

export const publicAuth = getAuth(publicApp);

export const publicDb = getFirestore(publicApp);

/**
 * =========================================================
 * TEMPORARY LEGACY PUBLIC USER
 * =========================================================
 *
 * HANYA untuk:
 *
 * - Friendship Wall lama
 * - Time Capsule lama
 * - Feedback lama
 *
 * Jangan digunakan oleh Photobooth.
 */
export async function ensurePublicUser(): Promise<User> {
  await publicAuth.authStateReady();

  if (publicAuth.currentUser) {
    return publicAuth.currentUser;
  }

  const credential = await signInAnonymously(publicAuth);

  return credential.user;
}

/**
 * =========================================================
 * ADMIN SESSION VERIFICATION
 * =========================================================
 */

export async function verifyAdminSession(user: User): Promise<boolean> {
  if (user.isAnonymous) {
    return false;
  }

  try {
    const idToken = await user.getIdToken(true);

    const response = await fetch("/api/admin/verify", {
      method: "GET",

      headers: {
        Authorization: `Bearer ${idToken}`,
      },

      cache: "no-store",
    });

    if (!response.ok) {
      if (process.env.NODE_ENV === "development") {
        const data = await response.json().catch(() => null);

        console.error("Admin verification failed:", data);
      }

      return false;
    }

    return true;
  } catch (error) {
    console.error("Admin session verification error:", error);

    return false;
  }
}
