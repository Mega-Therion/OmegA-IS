const Worker = require('../core/worker');
const { callLlm } = require('../services/llm');

class Synthesizer extends Worker {
    constructor() {
        super('Claude', 'Synthesizer');
    }

    async execute(mission, step) {
        console.log(`[Synthesizer] Compiling final report for mission: ${mission.id}`);

        // Compile mission log from all steps
        const missionLog = mission.steps
            .filter(s => s.status === 'completed' || s.output)
            .map(s => ({
                step: s.id,
                agent: s.agent,
                instruction: s.instruction,
                status: s.status,
                output: s.output?.detail || s.output?.error || 'No output'
            }));

        // Extract artifacts (file paths, code snippets, etc.)
        const artifacts = mission.steps
            .filter(s => s.output?.artifacts || s.output?.files)
            .flatMap(s => s.output?.artifacts || s.output?.files || []);

        const prompt = `
You are the Synthesizer. Your role is to compile all worker outputs into a final, coherent response for the user.

## Mission Objective
${mission.objective}

## Mission Status
${mission.status}

## Steps Completed
${JSON.stringify(missionLog, null, 2)}

## Artifacts Produced
${artifacts.length > 0 ? JSON.stringify(artifacts, null, 2) : 'None'}

## Decision Log
${mission.decisionLog?.length > 0 ? JSON.stringify(mission.decisionLog, null, 2) : 'None'}

---

Generate a final report in the following format. Return ONLY the markdown, no code fences:

# MISSION COMPLETE
[Brief summary of what was accomplished]

## Summary of Actions
- [Step-by-step summary of key actions taken]

## Artifacts
[List any files created, code written, or data produced]

## Next Steps
[Recommendations for what the user should do next, if any]
`;

        try {
            const response = await callLlm({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3
            });

            const report = response.choices
                ? response.choices[0].message.content
                : response.response.content;

            return {
                success: true,
                detail: report.trim(),
                artifacts
            };

        } catch (err) {
            console.error('[Synthesizer] Report generation failed:', err);

            // Fallback: Generate basic report without LLM
            const fallbackReport = this.generateFallbackReport(mission, missionLog, artifacts);
            return {
                success: true,
                detail: fallbackReport,
                artifacts,
                warning: 'Generated using fallback (LLM unavailable)'
            };
        }
    }

    generateFallbackReport(mission, missionLog, artifacts) {
        const stepsMarkdown = missionLog
            .map(s => `- **Step ${s.step}** (${s.agent}): ${s.instruction} - ${s.status}`)
            .join('\n');

        const artifactsMarkdown = artifacts.length > 0
            ? artifacts.map(a => `- ${a}`).join('\n')
            : '_None produced_';

        return `# MISSION COMPLETE

**Objective:** ${mission.objective}

## Summary of Actions
${stepsMarkdown || '_No steps recorded_'}

## Artifacts
${artifactsMarkdown}

## Next Steps
- Review the artifacts produced
- Verify the mission objective was met
- Create follow-up tasks if needed`;
    }
}

module.exports = new Synthesizer();
