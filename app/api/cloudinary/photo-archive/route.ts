import { NextResponse } from "next/server";

import cloudinary from "@/lib/cloudinary";
import { verifyFirebaseIdToken } from "@/lib/utils";

const PHOTOBOOTH_PREFIX = "the-archive/photobooth/";

const MAX_RESULTS = 100;

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  created_at?: string;
}

interface CloudinaryResourcesResponse {
  resources?: CloudinaryResource[];
  next_cursor?: string;
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

  /**
   * Archive hanya boleh dibaca dari admin
   * yang memiliki Firebase session.
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

  const { searchParams } = new URL(request.url);

  const cursor = searchParams.get("cursor")?.trim() || undefined;

  try {
    const result = (await cloudinary.api.resources({
      resource_type: "image",

      type: "upload",

      prefix: PHOTOBOOTH_PREFIX,

      max_results: MAX_RESULTS,

      ...(cursor
        ? {
            next_cursor: cursor,
          }
        : {}),
    })) as CloudinaryResourcesResponse;

    const resources = (result.resources ?? [])
      .filter(
        (resource) =>
          resource.public_id.startsWith(PHOTOBOOTH_PREFIX) &&
          Boolean(resource.secure_url),
      )
      .map((resource) => ({
        publicId: resource.public_id,

        url: resource.secure_url,

        format: resource.format ?? null,

        width: resource.width ?? null,

        height: resource.height ?? null,

        bytes: resource.bytes ?? null,

        createdAt: resource.created_at ?? null,
      }))
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;

        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        return bTime - aTime;
      });

    return NextResponse.json(
      {
        resources,

        nextCursor: result.next_cursor ?? null,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Cloudinary photo archive error:", error);

    return NextResponse.json(
      {
        message: "Gagal memuat Private Photo Archive.",
      },
      {
        status: 500,
      },
    );
  }
}
