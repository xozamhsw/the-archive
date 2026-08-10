import { NextResponse } from "next/server";

import cloudinary from "@/lib/cloudinary";

import { verifyAdminFirebaseIdToken } from "@/lib/utils";

const ALLOWED_PUBLIC_ID_PREFIXES = [
  "the-archive/gallery/",
  "the-archive/photobooth/",
] as const;

function isAllowedPublicId(publicId: string) {
  return ALLOWED_PUBLIC_ID_PREFIXES.some((prefix) =>
    publicId.startsWith(prefix),
  );
}

export async function DELETE(request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  const apiKey = process.env.CLOUDINARY_API_KEY;

  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        success: false,
        message: "Konfigurasi Cloudinary belum lengkap.",
      },
      {
        status: 500,
      },
    );
  }

  /**
   * Delete Cloudinary adalah operasi ADMIN.
   *
   * Jangan gunakan verifyFirebaseIdToken() generic,
   * karena user Firebase biasa/anonymous tidak boleh
   * mempunyai hak menghapus asset permanen.
   */
  const admin = await verifyAdminFirebaseIdToken(
    request.headers.get("authorization"),
  );

  if (!admin) {
    return NextResponse.json(
      {
        success: false,
        message: "Sesi admin tidak valid atau tidak memiliki akses.",
      },
      {
        status: 403,
      },
    );
  }

  let body: {
    publicId?: unknown;
  };

  try {
    body = (await request.json()) as {
      publicId?: unknown;
    };
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Payload request tidak valid.",
      },
      {
        status: 400,
      },
    );
  }

  const publicId =
    typeof body.publicId === "string" ? body.publicId.trim() : "";

  if (!publicId || !isAllowedPublicId(publicId)) {
    return NextResponse.json(
      {
        success: false,
        message: "Public ID tidak diizinkan.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    /**
     * Cloudinary destroy menggunakan public_id tanpa extension.
     * Asset Photobooth kita merupakan resource_type image,
     * delivery type upload.
     */
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      type: "upload",
      invalidate: true,
    });

    if (result.result !== "ok" && result.result !== "not found") {
      console.error("Cloudinary destroy rejected:", {
        publicId,
        result,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Cloudinary menolak penghapusan asset.",
          result: result.result,
        },
        {
          status: 502,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        result: result.result,
        publicId,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Cloudinary permanent delete error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat menghapus media dari Cloudinary.",
      },
      {
        status: 500,
      },
    );
  }
}
