import type { Pattern } from "@/types";

interface Props {
    pattern: Pattern;
}

export default function PatternSpecs({ pattern }: Props) {
    const renderStars = (difficulty: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <span
                key={i}
                className={i < difficulty ? "text-yellow-400" : "text-gray-300"}
            >
                ★
            </span>
        ));
    };

    return (
        <div className="space-y-4 pr-20">
            <h1 className="text-3xl font-bold">{pattern.name}</h1>
            <div className="space-y-3">
                <div>
                    <span className="font-semibold">Designer:</span> {pattern.designer}
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-semibold">Difficulty:</span>
                    <div className="flex">{renderStars(pattern.difficulty)}</div>
                </div>
                <div>
                    <span className="font-semibold">Description:</span>
                    <p className="text-gray-700">{pattern.description}</p>
                </div>
            </div>
        </div>
    );
}

