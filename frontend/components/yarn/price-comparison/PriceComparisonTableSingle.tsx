import type { SingleYarnOffer } from "@/types";
import type { YarnSingle } from "@/types/yarn";

interface Props {
    yarn: YarnSingle;
    offers: SingleYarnOffer[];
    metersRequired: number;
}

export default function PriceComparisonTableSingle({ yarn, offers, metersRequired }: Props) {
    const skeinsNeeded = Math.ceil(metersRequired / yarn.skeinLength);

    return (
        <div className="p-6">
          <div className="space-y-2">
            {offers
              .sort((a, b) => a.price - b.price)
              .map((offer, index) => (
                <div
                  key={offer.retailer.name}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 ${index === 0 ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{offer.retailer.name}</span>
                    {index === 0 && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                        Cheapest
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">
                      {skeinsNeeded} x {offer.price} =
                    </span>
                    <span className="font-bold">{offer.price * skeinsNeeded} DKK</span>
                    <a
                      href={offer.productUrl}
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

