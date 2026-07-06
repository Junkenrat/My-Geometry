import { formatFact, formatPremise, formatQuantity, getTheoremName } from "../engine/format";
import { Problem } from "../engine/problem";

interface SolutionProps {
    problem: Problem;
}

interface Step {
    theorem: string;
    premises: string[];
    result: string;
}

export function Solution({ problem }: SolutionProps) {
    const steps: Step[] = [];
    for (const fact of problem.facts) {
        if (fact.reason.kind !== "derived") continue;
        const result = formatFact(fact);
        if (result === null) continue;
        steps.push({
            theorem: fact.reason.theorem,
            premises: fact.reason.premises
                .map(premise => formatFact(premise))
                .filter((s): s is string => s !== null),
            result,
        });
    }
    for (const assignment of problem.quantities.assignments) {
        if (assignment.reason.kind !== "derived") continue;
        steps.push({
            theorem: assignment.reason.theorem,
            premises: assignment.reason.premises
                .map(premise => formatPremise(problem, premise))
                .filter((s): s is string => s !== null),
            result: formatQuantity(assignment.quantity),
        });
    }
    return (
        <div>
            {steps.length === 0 && <div>No derivation steps yet — press Solve.</div>}
            {steps.map((step, index) => (
                <div key={index}>
                    <strong>Step {index + 1}: {getTheoremName(step.theorem)}</strong>
                    {step.premises.length > 0 && (
                        <>
                            <div>From:</div>
                            <ul>
                                {step.premises.map((premise, i) => (
                                    <li key={i}>{premise}</li>
                                ))}
                            </ul>
                        </>
                    )}
                    <div>We get: {step.result}</div>
                </div>
            ))}
        </div>
    );
}
