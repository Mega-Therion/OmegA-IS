const Worker = require('../core/worker');
const { callLlm } = require('../services/llm');

class Critic extends Worker {
    constructor() {
        super('Claude', 'Critic');
    }

    async execute(mission, step) {
        console.log(`[Critic] Reviewing: ${step.instruction}`);
        
        // Context: What has been done so far?
        // We'll pass the last few steps' outputs or the specific target file if mentioned.
        
        const prompt = `
        You are the Critic (Claude).
        Mission Objective: "${mission.objective}"
        Current Instruction: "${step.instruction}"
        
        Analyze the work performed or the plan proposed. 
        If the instruction involves code, look for logic errors, security risks, or missing requirements.
        
        Return JSON ONLY:
        {
            "success": true | false,
            "feedback": "Detailed critique...",
            "score": 0-10
        }
        `;

        try {
            const response = await callLlm({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1
            });

            const contentStr = response.choices ? response.choices[0].message.content : response.response.content;
            const critique = JSON.parse(contentStr.replace(/```json/g, '').replace(/```/g, '').trim());

            return { 
                success: true, // The critique itself succeeded
                detail: `Score: ${critique.score}/10. Feedback: ${critique.feedback}` 
            };

        } catch (err) {
            console.error('[Critic] Review failed:', err);
            return { success: false, error: err.message };
        }
    }
}

module.exports = new Critic();
