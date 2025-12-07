"use client";

import Link from "next/link";
import Image from "next/image";
import { UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Header() {
    const router = useRouter();
    return (
        <header className="bg-white shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center">
                {/* Logo */}
                <div className="w-52">
                    <Link href="/" className="flex items-center gap-2">
                        <Image src="/logo.png" alt="Garnalternativer" width={50} height={50} />
                        <span>garnalternativer.dk</span>
                    </Link>
                </div>

                {/* Nav */}
                <nav className="flex-1 flex justify-center gap-8">
                    <Link href="/">Home</Link>
                    <Link href="/">Yarn substitution</Link>
                    <Link href="/about">About</Link>
                    <Link href="/contact">Contact</Link>
                </nav>

                {/* My Account */}
                <div className="w-52 flex justify-end">
                    <button
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                        onClick={() => router.push("/my-account")}
                    >
                        <UserIcon className="w-5 h-5" />
                        My Account
                    </button>
                </div>
            </div>

        </header>
    );
}

