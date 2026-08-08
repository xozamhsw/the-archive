import { NextResponse } from "next/server";

import cloudinary from "@/lib/cloudinary";

import { verifyFirebaseIdToken } from "@/lib/utils";

const ALLOWED_PUBLIC_ID_PREFIXES = [
  "the-archive/gallery/",
  "the-archive/photobooth/",
] as const;

function isAllowedPublicId(publicId: string): boolean {
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
        message: "Konfigurasi Cloudinary belum lengkap.",
      },
      {
        status: 500,
      },
    );
  }

  /**
   * Delete media hanya boleh dilakukan
   * oleh admin yang memiliki sesi Firebase valid.
   */
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
        message: "Public ID tidak diizinkan.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });

    /**
     * "not found" tetap dianggap sukses.
     *
     * Misalnya Firestore masih menyimpan publicId,
     * tetapi image Cloudinary sebelumnya sudah
     * terhapus manual.
     */
    if (result.result !== "ok" && result.result !== "not found") {
      return NextResponse.json(
        {
          message: "Cloudinary gagal menghapus media.",
        },
        {
          status: 502,
        },
      );
    }

    return NextResponse.json({
      success: true,
      result: result.result,
    });
  } catch (error) {
    console.error("Cloudinary delete error:", error);

    return NextResponse.json(
      {
        message: "Terjadi kesalahan saat menghapus media.",
      },
      {
        status: 500,
      },
    );
  }
}
