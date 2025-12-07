import Image from "next/image";
import type { Yarn } from "@/types/yarn";
import { getLowestTotalPriceAvailable } from "@/lib/yarn";

interface Props {
  yarn?: Yarn;
  metersRequired?: number;
  setSelectedYarn?: (yarn: Yarn) => void;
  skeleton?: boolean;
}

export default function YarnCard({ yarn, metersRequired, setSelectedYarn, skeleton = false }: Props) {

  const lowestTotalPriceAvailable = yarn && metersRequired ? getLowestTotalPriceAvailable(yarn, metersRequired) : 0;

  return (
    <div
      className={`bg-white rounded-lg shadow-md overflow-hidden ${!skeleton ? 'hover:shadow-lg transition-shadow cursor-pointer' : ''}`}
      onClick={() => !skeleton && yarn && setSelectedYarn?.(yarn)}
    >
      {/* Card image */}
      <div className="relative w-full h-48 bg-gray-200">
        {skeleton ? (
          <>
            {/* Skeleton data */}
            <div>
              <div className="w-full h-full animate-pulse bg-gray-200" />
              <div className="absolute top-2 right-2 w-16 h-6 bg-gray-300 rounded animate-pulse" />
            </div>
          </>
        ) : (
          <>
            {/* Real data */}
            <div>
              <Image
                src={yarn!.image}
                alt={yarn!.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <div className="price-tag bg-green-500 text-white px-2 py-1 rounded absolute top-2 right-2">
                {lowestTotalPriceAvailable} DKK
              </div>
            </div>
          </>
        )}
      </div>

      {/* Card content */}
      <div className="p-4">
        {skeleton ? (
          <>
            {/* Skeleton data */}
            <div>
              <div className="h-6 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3 mb-4" />
              <div className="h-10 bg-gray-200 rounded animate-pulse" />
            </div>
          </>
        ) : (
          <>
            {/* Real data */}
            <div>
              <h3 className="text-lg font-semibold min-h-12 leading-tight">{yarn!.name}</h3>
              <button className="bg-blue-500 text-white px-4 py-2 rounded w-full mt-4 cursor-pointer">
                Select
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
