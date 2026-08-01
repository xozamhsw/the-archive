import Link from "next/link";

export default function WallPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-bold">Friendship Wall</h1>
      <p className="text-gray-500">
        Placeholder: pesan, emoji, rating dari sahabat
      </p>
      <Link
        href="/capsule"
        className="bg-blue-600 text-white px-6 py-3 rounded"
      >
        Lanjut ke Time Capsule
      </Link>
    </main>
  );
}
