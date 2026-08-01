import Link from "next/link";

export default function GalleryPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-bold">Memory Gallery</h1>
      <p className="text-gray-500">
        Placeholder: timeline kenangan, foto + cerita, video
      </p>
      <Link
        href="/photobooth"
        className="bg-blue-600 text-white px-6 py-3 rounded"
      >
        Lanjut ke Photobooth
      </Link>
    </main>
  );
}
