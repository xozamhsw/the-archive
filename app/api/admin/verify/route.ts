import { NextResponse } from "next/server";

import { verifyAdminFirebaseIdToken } from "@/lib/utils";

export async function GET(request: Request) {
  /**
   * Jika ADMIN_UID belum dipasang di environment,
   * endpoint admin sengaja dianggap belum siap.
   */
  if (!process.env.ADMIN_UID?.trim()) {
    return NextResponse.json(
      {
        isAdmin: false,
        message: "ADMIN_UID belum dikonfigurasi pada server.",
      },
      {
        status: 500,
      },
    );
  }

  /**
   * Ambil Firebase ID Token dari:
   *
   * Authorization: Bearer TOKEN
   */
  const admin = await verifyAdminFirebaseIdToken(
    request.headers.get("authorization"),
  );

  /**
   * Firebase account valid tetapi UID tidak sama
   * dengan ADMIN_UID juga akan ditolak.
   */
  if (!admin) {
    return NextResponse.json(
      {
        isAdmin: false,
        message: "Akun ini tidak memiliki akses admin.",
      },
      {
        status: 403,
      },
    );
  }

  return NextResponse.json(
    {
      isAdmin: true,

      uid: admin.localId,

      email: admin.email,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
