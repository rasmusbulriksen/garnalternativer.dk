import type { YarnDouble, YarnSingle } from "@/types/yarn";
import type { Retailer } from "@/types";
import { calculateTotalPriceForRetailer, getYarnSingleByIdOrThrow, getYarnSinglePriceForRetailer } from "@/lib/yarn";
import Image from "next/image";

interface RetailerLineItem {
    retailer: Retailer;
    mainYarn: YarnSingle;
    carryAlongYarn: YarnSingle;
    totalPrice: number;
}

interface Props {
    yarn: YarnDouble;
    retailers: Retailer[];
    metersRequired: number;
}

export default function PriceComparisonTableDouble({ yarn, retailers, metersRequired }: Props) {

    // Cheapest first
    const retailerLineItems: RetailerLineItem[] = retailers.sort((a, b) => calculateTotalPriceForRetailer(yarn, metersRequired, a) - calculateTotalPriceForRetailer(yarn, metersRequired, b)).map((retailer) => {
        return {
            retailer: retailer,
            mainYarn: getYarnSingleByIdOrThrow(yarn.mainYarnId),
            carryAlongYarn: getYarnSingleByIdOrThrow(yarn.carryAlongYarnId),
            totalPrice: calculateTotalPriceForRetailer(yarn, metersRequired, retailer),
        };
    });

    return (
        <div className="p-6">
            <div className="space-y-3">
                {retailerLineItems.map((retailerLineItem, index) => (
                    <div
                        key={retailerLineItem.retailer.name}
                        className={`p-4 rounded-lg border-2 ${index === 0 ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                    >
                        {/* Retailer */}
                        <div className="flex items-center gap-3 mb-3">
                            <span className="font-medium text-lg">{retailerLineItem.retailer.name}</span>
                            {index === 0 && (
                                <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                                    Cheapest
                                </span>
                            )}
                        </div>

                        {/* Main Yarn */}
                        <div className="flex items-center justify-between py-2 pl-4 border-l-2 border-gray-300">
                            <Image src={retailerLineItem.mainYarn.image} alt={retailerLineItem.mainYarn.name} width={50} height={50} className="rounded-lg object-cover" />
                            <span className="text-sm text-gray-700">{retailerLineItem.mainYarn.name}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">
                                    {Math.ceil(metersRequired / retailerLineItem.mainYarn.skeinLength)} x {getYarnSinglePriceForRetailer(retailerLineItem.mainYarn, retailerLineItem.retailer)} =
                                </span>
                                <span className="font-bold">{Math.ceil(metersRequired / retailerLineItem.mainYarn.skeinLength) * getYarnSinglePriceForRetailer(retailerLineItem.mainYarn, retailerLineItem.retailer)} DKK</span>
                                <a
                                    href={retailerLineItem.mainYarn.dummyUrl}
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
                            <Image src={retailerLineItem.carryAlongYarn.image} alt={retailerLineItem.carryAlongYarn.name} width={50} height={50} className="rounded-lg object-cover" />
                            <span className="text-sm text-gray-700">{retailerLineItem.carryAlongYarn.name}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">
                                    {Math.ceil(metersRequired / retailerLineItem.carryAlongYarn.skeinLength)} x {getYarnSinglePriceForRetailer(retailerLineItem.carryAlongYarn, retailerLineItem.retailer)} =
                                </span>
                                <span className="font-bold">{Math.ceil(metersRequired / retailerLineItem.carryAlongYarn.skeinLength) * getYarnSinglePriceForRetailer(retailerLineItem.carryAlongYarn, retailerLineItem.retailer)} DKK</span>
                                <a
                                    href={retailerLineItem.carryAlongYarn.dummyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                    Buy
                                </a>
                            </div>
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-300">
                            <span className="font-medium">Total</span>
                            <span className="font-bold text-lg">{calculateTotalPriceForRetailer(yarn, metersRequired, retailerLineItem.retailer)} DKK</span>
                        </div>

                    </div>
                ))}
            </div>
        </div >
    );
}

