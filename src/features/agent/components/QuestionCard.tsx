import type { AgentQuestion } from '../api/agentTypes';

interface QuestionProps {
    question: AgentQuestion;
    active: boolean;
    answer: (option: string) => void;
}

export function QuestionCard({ question, active, answer }: QuestionProps) {
    return (
        <div className="space-y-2">
            <p className="whitespace-pre-wrap font-medium">{question.question}</p>
            <div className="flex flex-wrap gap-2">
                {question.options.map((option, index) => (
                    <button
                        key={index}
                        type="button"
                        disabled={!active}
                        onClick={() => answer(option)}
                        className="rounded-lg border px-3 py-2 hover:border-verdaxis disabled:opacity-60"
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );
}
