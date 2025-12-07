"use client";

import { useState, useMemo, useEffect } from "react";
import PatternSpecs from "@/components/pattern/PatternSpecs";
import PatternImage from "@/components/pattern/PatternImage";
import SizeSelector from "@/components/ui/SizeSelector";
import YarnGrid from "@/components/yarn/YarnGrid";
import type { Pattern } from "@/types";
import type { Yarn } from "@/types/yarn";
import patterns from "@/data/patterns.json";
import { getAllYarnsAsync, getLowestTotalPriceAvailable } from "@/lib/yarn";
import { SizeEnum } from "@/types/user-preferences";
import useUserPreferences from "@/lib/hooks/use-user-preferences";
import { PriceComparisonPopup } from "@/components/yarn/price-comparison";

export default function SpotSweaterPage() {
    const pattern = patterns.find((p: Pattern) => p.id === "spot-sweater") as Pattern;
    const { userPreferences } = useUserPreferences();

    const [yarns, setYarns] = useState<Yarn[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const sizes = Object.keys(pattern.sizes) as SizeEnum[];
    const [selectedSize, setSelectedSize] = useState<SizeEnum>(sizes[0]);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [selectedYarn, setSelectedYarn] = useState<Yarn | null>(null);

    // Fetch yarns asynchronously
    useEffect(() => {
        getAllYarnsAsync().then((data) => {
            setYarns(data);
            setIsLoading(false);
        });
    }, []);

    const metersRequired = useMemo(() => {
        return pattern.sizes[selectedSize] || 0;
    }, [pattern.sizes, selectedSize]);

    const sortedYarns = useMemo(() => {
        return [...yarns].sort((a, b) => {
            return sortDirection === 'asc'
                ? getLowestTotalPriceAvailable(a, metersRequired) - getLowestTotalPriceAvailable(b, metersRequired)
                : getLowestTotalPriceAvailable(b, metersRequired) - getLowestTotalPriceAvailable(a, metersRequired);
        });
    }, [yarns, sortDirection, metersRequired]);

    useEffect(() => {
        setSelectedSize(userPreferences.size);
    }, [userPreferences.size]);

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 mb-8">
                    <div className="lg:col-span-6 flex flex-col gap-8">
                        <PatternSpecs pattern={pattern} />
                        <SizeSelector
                            selectedSize={selectedSize}
                            sizes={sizes}
                            onSizeChange={setSelectedSize}
                        />
                    </div>
                    <div className="lg:col-span-4">
                        <PatternImage pattern={pattern} />
                    </div>
                </div>
                <div className="mb-8">
                    <YarnGrid
                        yarns={sortedYarns}
                        metersRequired={metersRequired}
                        direction={sortDirection}
                        changeDirection={setSortDirection}
                        setSelectedYarn={setSelectedYarn}
                        loading={isLoading}
                    />
                </div>
            </div>
            {selectedYarn && (
                <PriceComparisonPopup
                    yarn={selectedYarn}
                    pattern={pattern}
                    selectedSize={selectedSize}
                    metersRequired={metersRequired}
                    onClose={() => setSelectedYarn(null)}
                />
            )}
        </div>
    );
}
