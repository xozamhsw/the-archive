import Link from "next/link";

export default function PhotoboothPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-bold">Virtual Photobooth</h1>
      <p className="text-gray-500">
        Placeholder: live camera, template, filter, 4-photo strip
      </p>
      <Link href="/wall" className="bg-blue-600 text-white px-6 py-3 rounded">
        Lanjut ke Friendship Wall
      </Link>
    </main>
  );
}
