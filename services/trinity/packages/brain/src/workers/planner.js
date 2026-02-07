const Worker = require('../core/worker');
const { callLlm } = require('../services/llm');

class Planner extends Worker {
    constructor() {
        super('Claude', 'Planner');
    }

    async execute(mission) {
        console.log(`[Planner] Decomposing mission: ${mission.objective}`);
        
        const prompt = `
        You are the Planner (Claude). 
        Objective: "${mission.objective}"
        
        Create a step-by-step plan to achieve this.
        Available Workers:
        - Researcher: Searches web/codebase.
        - Builder: Writes code/files.
        - Critic: Reviews code/plans.
        
        Return JSON ONLY:
        {
            "steps": [
                { "agent": "worker_name", "instruction": "specific_task" }
            ]
        }
        `;

        try {
            const response = await callLlm({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2
            });

            const content = response.choices ? response.choices[0].message.content : response.response.content;
            
            // Basic cleanup to ensure JSON
            const jsonStr = content.replace(/```json/g, ').replace(/```/g, ').trim();
            const plan = JSON.parse(jsonStr);

            mission.steps = []; // Reset steps
            plan.steps.forEach(s => {
                mission.addStep(s.agent.toLowerCase(), s.instruction);
            });
            
            mission.setStatus('ACTIVE');
            return { success: true, plan: mission.steps };

        } catch (err) {
            console.error('[Planner] Failed to generate plan:', err);
            return { success: false, error: err.message };
        }
    }
}

module.exports = new Planner();

