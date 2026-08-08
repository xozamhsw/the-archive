import { NextResponse } from "next/server";

import cloudinary from "@/lib/cloudinary";

import { verifyAdminFirebaseIdToken } from "@/lib/utils";

const ALLOWED_FOLDERS = {
  gallery: "the-archive/gallery",

  photobooth: "the-archive/photobooth",
} as const;

type UploadFolder = (typeof ALLOWED_FOLDERS)[keyof typeof ALLOWED_FOLDERS];

function isAllowedFolder(folder: string): folder is UploadFolder {
  return Object.values(ALLOWED_FOLDERS).includes(folder as UploadFolder);
}

export async function GET(request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  const apiKey = process.env.CLOUDINARY_API_KEY;

  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        message: "Konfigurasi Cloudinary belum lengkap.",
      },
      {
        status: 500,
      },
    );
  }

  const { searchParams } = new URL(request.url);

  const folder = searchParams.get("folder");

  if (!folder || !isAllowedFolder(folder)) {
    return NextResponse.json(
      {
        message: "Folder upload tidak diizinkan.",
      },
      {
        status: 400,
      },
    );
  }

  /**
   * =========================================================
   * GALLERY
   * =========================================================
   *
   * Gallery merupakan CMS admin.
   *
   * Signed upload hanya diberikan kepada admin yang valid.
   */
  if (folder === ALLOWED_FOLDERS.gallery) {
    const admin = await verifyAdminFirebaseIdToken(
      request.headers.get("authorization"),
    );

    if (!admin) {
      return NextResponse.json(
        {
          message: "Akses upload Gallery hanya untuk admin.",
        },
        {
          status: 403,
        },
      );
    }
  }

  /**
   * =========================================================
   * PHOTOBOOTH
   * =========================================================
   *
   * Photobooth merupakan fitur public.
   *
   * Tidak membutuhkan:
   *
   * - Firebase Auth
   * - Anonymous Auth
   * - Firebase ID Token
   * - Authorization header
   *
   * Folder tetap di-whitelist agar client tidak dapat meminta
   * signed upload untuk folder arbitrary.
   */

  const timestamp = Math.round(Date.now() / 1000);

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
    },
    apiSecret,
  );

  return NextResponse.json(
    {
      timestamp,
      signature,
      cloudName,
      apiKey,
      folder,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
