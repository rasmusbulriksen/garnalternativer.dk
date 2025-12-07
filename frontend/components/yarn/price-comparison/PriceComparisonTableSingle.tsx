import type { Retailer } from "@/types";
import type { YarnSingle } from "@/types/yarn";
import { getYarnSinglePriceForRetailer } from "@/lib/yarn";

interface Props {
    yarn: YarnSingle;
    retailers: Retailer[];
    metersRequired: number;
}

export default function PriceComparisonTableSingle({ yarn, retailers, metersRequired }: Props) {

    const skeinsNeeded = Math.ceil(metersRequired / yarn.skeinLength);

    return (
        <div className="p-6">
          <div className="space-y-2">
            {retailers
              .sort((a, b) => getYarnSinglePriceForRetailer(yarn, a) - getYarnSinglePriceForRetailer(yarn, b))
              .map((retailer, index) => (
                <div
                  key={retailer.name}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 ${index === 0 ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{retailer.name}</span>
                    {index === 0 && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                        Cheapest
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">
                      {skeinsNeeded} x {getYarnSinglePriceForRetailer(yarn, retailer)} =
                    </span>
                    <span className="font-bold">{getYarnSinglePriceForRetailer(yarn, retailer) * skeinsNeeded} DKK</span>
                    <a
                      href={yarn.dummyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Buy
                    </a>
                  </div>
                </div>
              ))}
          </div>
        </div>
    );
}

