"use client";

import SizeSelector from "@/components/ui/SizeSelector";
import useUserPreferences from "@/lib/hooks/use-user-preferences";
import { SizeEnum } from "@/types/user-preferences";

export default function MyAccount() {
    const sizes = Object.values(SizeEnum);
    const { userPreferences, setUserPreferences } = useUserPreferences();
    return (
        <div className="min-h-screen flex items-center justify-center text-center">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">My Account</h1>
                <SizeSelector
                    selectedSize={userPreferences.size}
                    sizes={sizes}
                    onSizeChange={(size: SizeEnum) => setUserPreferences({ ...userPreferences, size: size })}
                />
            </div>
        </div>
    );
}
