import Image from "next/image";
import type { Pattern } from "@/types";

interface Props {
  pattern: Pattern;
}

export default function PatternImage({ pattern }: Props) {
  return (
    <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden">
      <Image
        src={pattern.image}
        alt={pattern.name}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
        priority
      />
    </div>
  );
}

