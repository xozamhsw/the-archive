import { NextResponse } from "next/server";

import cloudinary from "@/lib/cloudinary";
import { verifyFirebaseIdToken } from "@/lib/utils";

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
   * Memory Gallery hanya boleh meminta signature
   * melalui sesi Firebase admin yang valid.
   *
   * Photobooth tetap public karena dipakai pengunjung.
   */
  if (folder === ALLOWED_FOLDERS.gallery) {
    const user = await verifyFirebaseIdToken(
      request.headers.get("authorization"),
    );

    if (!user) {
      return NextResponse.json(
        {
          message: "Sesi admin tidak valid atau sudah berakhir.",
        },
        {
          status: 401,
        },
      );
    }
  }

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
