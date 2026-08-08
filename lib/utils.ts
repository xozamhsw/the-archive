export interface VerifiedFirebaseUser {
  localId: string;
  email: string | null;
}

interface FirebaseLookupResponse {
  users?: Array<{
    localId?: string;
    email?: string;
  }>;
}

/**
 * Memverifikasi Firebase ID Token dari Authorization header.
 *
 * Format yang diterima:
 *
 * Authorization: Bearer FIREBASE_ID_TOKEN
 */
export async function verifyFirebaseIdToken(
  authorizationHeader: string | null,
): Promise<VerifiedFirebaseUser | null> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  const idToken = authorizationHeader.slice("Bearer ".length).trim();

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!idToken || !apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          idToken,
        }),

        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as FirebaseLookupResponse;

    const user = data.users?.[0];

    if (!user?.localId) {
      return null;
    }

    return {
      localId: user.localId,
      email: user.email ?? null,
    };
  } catch (error) {
    console.error("Firebase ID token verification error:", error);

    return null;
  }
}

/**
 * Memastikan Firebase ID Token benar-benar milik
 * akun admin The Archive.
 *
 * Firebase user valid belum tentu seorang admin.
 * UID token harus sama dengan ADMIN_UID server.
 */
export async function verifyAdminFirebaseIdToken(
  authorizationHeader: string | null,
): Promise<VerifiedFirebaseUser | null> {
  const adminUid = process.env.ADMIN_UID?.trim();

  if (!adminUid) {
    console.error("ADMIN_UID belum dikonfigurasi.");

    return null;
  }

  const user = await verifyFirebaseIdToken(authorizationHeader);

  if (!user || user.localId !== adminUid) {
    return null;
  }

  return user;
}
