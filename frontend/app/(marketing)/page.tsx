import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Garnalternativer</h1>
        <p className="text-lg mb-8">Yarn substitution for knitting patterns</p>
        <Link
          href="/spot-sweater"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          View Spot Sweater
        </Link>
      </div>
    </div>
  );
}

