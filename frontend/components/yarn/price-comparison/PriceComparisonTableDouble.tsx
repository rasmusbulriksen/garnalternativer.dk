import type { YarnDouble, YarnSingle } from "@/types/yarn";
import type { DoubleYarnOffer } from "@/types";
import { getYarnSingleByIdOrThrow } from "@/lib/yarn";
import Image from "next/image";

interface Row {
    offer: DoubleYarnOffer;
    mainYarn: YarnSingle;
    carryAlongYarn: YarnSingle;
    totalPrice: number;
}

interface Props {
    yarn: YarnDouble;
    offers: DoubleYarnOffer[];
    metersRequired: number;
}

export default function PriceComparisonTableDouble({ yarn, offers, metersRequired }: Props) {
    const mainYarn = getYarnSingleByIdOrThrow(yarn.mainYarnId);
    const carryAlongYarn = getYarnSingleByIdOrThrow(yarn.carryAlongYarnId);

    // Calculate total price for each offer and sort cheapest first
    const rows: Row[] = offers.map((offer) => {
        const mainYarnSkeinsNeeded = Math.ceil(metersRequired / mainYarn.skeinLength);
        const carryAlongYarnSkeinsNeeded = Math.ceil(metersRequired / carryAlongYarn.skeinLength);
        const totalPrice = (offer.mainYarn.price * mainYarnSkeinsNeeded) + (offer.carryAlongYarn.price * carryAlongYarnSkeinsNeeded);
        
        return {
            offer: offer,
            mainYarn: mainYarn,
            carryAlongYarn: carryAlongYarn,
            totalPrice: totalPrice,
        };
    }).sort((a, b) => a.totalPrice - b.totalPrice);

    return (
        <div className="p-6">
            <div className="space-y-3">
                {rows.map((row, index) => {
                    const mainYarnSkeinsNeeded = Math.ceil(metersRequired / row.mainYarn.skeinLength);
                    const carryAlongYarnSkeinsNeeded = Math.ceil(metersRequired / row.carryAlongYarn.skeinLength);
                    
                    return (
                        <div
                            key={row.offer.retailer.name}
                            className={`p-4 rounded-lg border-2 ${index === 0 ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                        >
                            {/* Retailer */}
                            <div className="flex items-center gap-3 mb-3">
                                <span className="font-medium text-lg">{row.offer.retailer.name}</span>
                                {index === 0 && (
                                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                                        Cheapest
                                    </span>
                                )}
                            </div>

                            {/* Main Yarn */}
                            <div className="flex items-center justify-between py-2 pl-4 border-l-2 border-gray-300">
                                <Image src={row.mainYarn.image} alt={row.mainYarn.name} width={50} height={50} className="rounded-lg object-cover" />
                                <span className="text-sm text-gray-700">{row.mainYarn.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">
                                        {mainYarnSkeinsNeeded} x {row.offer.mainYarn.price} =
                                    </span>
                                    <span className="font-bold">{row.offer.mainYarn.price * mainYarnSkeinsNeeded} DKK</span>
                                    <a
                                        href={row.offer.mainYarn.productUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                    >
                                        Buy
                                    </a>
                                </div>
                            </div>

                            {/* Carry-along Yarn */}
                            <div className="flex items-center justify-between py-2 pl-4 border-l-2 border-gray-300">
                                <Image src={row.carryAlongYarn.image} alt={row.carryAlongYarn.name} width={50} height={50} className="rounded-lg object-cover" />
                                <span className="text-sm text-gray-700">{row.carryAlongYarn.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">
                                        {carryAlongYarnSkeinsNeeded} x {row.offer.carryAlongYarn.price} =
                                    </span>
                                    <span className="font-bold">{row.offer.carryAlongYarn.price * carryAlongYarnSkeinsNeeded} DKK</span>
                                    <a
                                        href={row.offer.carryAlongYarn.productUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                    >
                                        Buy
                                    </a>
                                </div>
                            </div>

                            {/* Total */}
                            <div className="flex items-center justify-between pt-3 mt-2 border-gray-300">
                                <span className="font-medium">Total</span>
                                <span className="font-bold text-lg">{row.totalPrice} DKK</span>
                            </div>

                        </div>
                    );
                })}
            </div>
        </div >
    );
}

