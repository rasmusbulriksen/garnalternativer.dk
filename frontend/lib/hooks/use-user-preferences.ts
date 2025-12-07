import { useEffect, useState } from "react";
import { UserPreferences, SizeEnum } from "@/types/user-preferences";

export default function useUserPreferences() {
    const [userPreferences, setUserPreferences] = useState<UserPreferences>({ size: SizeEnum.M }); // Default size is M

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem("userPreferences");
        if (saved) {
            setUserPreferences(JSON.parse(saved));
        }
    }, []);

    // Update preferences by saving to localStorage and API
    const updatePreferences = (newPrefs: UserPreferences) => {
        setUserPreferences(newPrefs);
        localStorage.setItem("userPreferences", JSON.stringify(newPrefs));
        
        // POST to API (writes to @/data/user-preferences.json)
        fetch("/api/preferences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newPrefs),
        });
    };

    return { userPreferences, setUserPreferences: updatePreferences };
}

