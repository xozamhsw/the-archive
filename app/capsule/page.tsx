import Link from "next/link";

export default function CapsulePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-bold">Time Capsule</h1>
      <p className="text-gray-500">
        Placeholder: Dear Future Me, Message for Zagar
      </p>
      <Link href="/ending" className="bg-blue-600 text-white px-6 py-3 rounded">
        Lanjut ke Ending
      </Link>
    </main>
  );
}
