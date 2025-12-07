"use client";

import { SizeEnum } from "@/types/user-preferences";

interface Props {
  selectedSize: SizeEnum;
  sizes: SizeEnum[];
  onSizeChange: (size: SizeEnum) => void;
}

export default function SizeSelector({
  selectedSize,
  sizes,
  onSizeChange,
}: Props) {
  return (
    <div className="w-full">
      <label htmlFor="size-selector" className="block text-lg font-semibold mb-2">
        Select Your Size
      </label>
      <div className="flex gap-2 flex-wrap">
        {sizes.map((size) => (
          <button
            key={size}
            onClick={() => onSizeChange(size)}
            className={`px-6 py-2 rounded-lg border-2 transition-colors ${
              selectedSize === size
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
            }`}
            aria-pressed={selectedSize === size}
            aria-label={`Select size ${size}`}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  );
}

