import type { Yarn } from "@/types/yarn";
import YarnCard from "@/components/yarn/YarnCard";
import YarnGridSort from "@/components/yarn/YarnGridSort";

interface Props {
    yarns: Yarn[];
    metersRequired: number;
    direction: 'asc' | 'desc';
    changeDirection: (direction: 'asc' | 'desc') => void;
    setSelectedYarn: (yarn: Yarn) => void;
    loading?: boolean;
}

export default function YarnGrid({ yarns, metersRequired, direction, changeDirection, setSelectedYarn: setSelectedYarn, loading = false }: Props) {
    return (
        <div className="w-full">
            <div className="flex justify-between items-center">
                {loading ? (
                    <>
                        {/* Skeleton data */}
                        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
                        <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                    </>
                ) : (
                    <>
                        {/* Real data */}
                        <h2 className="text-2xl font-bold mb-6">Yarn Alternatives</h2>
                        <YarnGridSort direction={direction} changeDirection={changeDirection} />
                    </>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? (
                    <>
                        {/* Skeleton data */}
                        {Array.from({ length: 8 }).map((_, i) => (
                            <YarnCard key={i} skeleton />
                        ))}
                    </>
                ) : (
                    <>
                        {/* Real data */}
                        {yarns.map((yarn) => (
                            <YarnCard key={yarn.id} yarn={yarn} metersRequired={metersRequired} setSelectedYarn={setSelectedYarn} />
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}