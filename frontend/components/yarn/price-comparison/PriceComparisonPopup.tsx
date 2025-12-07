"use client";

import Image from "next/image";
import type { Yarn } from "@/types/yarn";
import type { Pattern } from "@/types";
import { SizeEnum } from "@/types/user-preferences";
import { getYarnRetailers, getYarnSkeinLength } from "@/lib/yarn";
import PriceComparisonTable from "@/components/yarn/price-comparison/PriceComparisonTable";

interface Props {
  yarn: Yarn;
  pattern: Pattern;
  selectedSize: SizeEnum;
  metersRequired: number;
  onClose: () => void;
}

export default function PriceComparisonPopup({
  yarn,
  pattern,
  selectedSize,
  metersRequired,
  onClose,
}: Props) {
  const skeinLength = getYarnSkeinLength(yarn);
  const skeinsNeeded = Math.ceil(metersRequired / skeinLength);
  const retailers = getYarnRetailers(yarn);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl float-right"
          >
            ×
          </button>
        </div>

        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center justify-items-center">

            <div className="relative w-60 h-40 rounded-lg overflow-hidden justify-self-end">
              <Image src={yarn.image} alt={yarn.name} fill className="object-cover" />
            </div>

            <div className="text-3xl text-gray-400">=</div>

            <div className="relative w-60 h-40 rounded-lg overflow-hidden justify-self-start">
              <Image src={pattern.image} alt={pattern.name} fill className="object-cover" />
            </div>

            <div className="text-center justify-self-end w-60">
              <p className="text-sm font-medium text-gray-700">{yarn.name}</p>
              <div className="text-blue-800">{skeinsNeeded}x</div>
            </div>

            {/* Empty grid cell. If deleted, the grid breaks. */}
            <div></div>

            <div className="text-center justify-self-start w-60">
              <p className="text-sm font-medium text-gray-700">{pattern.name}</p>
              <div className="text-blue-800">
                Size {selectedSize}
              </div>
            </div>

          </div>
        </div>

        <PriceComparisonTable 
          yarn={yarn}
          retailers={retailers}
          metersRequired={metersRequired}
        />
      </div>
    </div>
  );
}

