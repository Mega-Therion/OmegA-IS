const fs = require('fs');
const path = require('path');
const Worker = require('../core/worker');
const { callLlm } = require('../services/llm');

class Researcher extends Worker {
    constructor() {
        super('Claude', 'Researcher');
    }

    async execute(mission, step) {
        console.log(`[Researcher] Investigating: ${step.instruction}`);
        
        const prompt = `
        You are the Researcher (Claude). 
        Mission Objective: "${mission.objective}"
        Current Instruction: "${step.instruction}"
        
        Decide the best way to gather information.
        Available Actions:
        - READ_FILE: Read contents of a specific file.
        - LIST_DIR: List files in a directory.
        - SEARCH_CODE: Search for a pattern in the codebase.
        - WEB_SEARCH: Search the internet (Simulated).
        
        Return JSON ONLY:
        {
            "action": "READ_FILE" | "LIST_DIR" | "SEARCH_CODE" | "WEB_SEARCH",
            "target": "path/or/query"
        }
        `;

        try {
            const response = await callLlm({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1
            });

            const contentStr = response.choices ? response.choices[0].message.content : response.response.content;
            const plan = JSON.parse(contentStr.replace(/```json/g, ').replace(/```/g, ').trim());

            switch(plan.action) {
                case 'READ_FILE': return await this.readFile(plan.target);
                case 'LIST_DIR': return await this.listDir(plan.target);
                case 'WEB_SEARCH': return await this.webSearch(plan.target);
                default: return { success: false, error: `Unsupported action: ${plan.action}` };
            }

        } catch (err) {
            console.error('[Researcher] Research failed:', err);
            return { success: false, error: err.message };
        }
    }

    async readFile(target) {
        try {
            const filePath = path.isAbsolute(target) ? target : path.resolve(process.cwd(), target);
            if (!fs.existsSync(filePath)) return { success: false, error: `File not found: ${target}` };
            const content = fs.readFileSync(filePath, 'utf8');
            return { success: true, detail: `Read ${content.length} chars from ${target}.`, data: content };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async listDir(target) {
        try {
            const dirPath = path.isAbsolute(target) ? target : path.resolve(process.cwd(), target);
            if (!fs.existsSync(dirPath)) return { success: false, error: `Dir not found: ${target}` };
            const files = fs.readdirSync(dirPath);
            return { success: true, detail: `Found ${files.length} items in ${target}.`, data: files };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async webSearch(query) {
        // Use Perplexity for real internet search capability
        try {
            const response = await callLlm({
                provider: 'perplexity',
                messages: [{ role: 'user', content: query }],
                temperature: 0.2
            });
            const info = response.choices ? response.choices[0].message.content : response.response.content;
            return { success: true, detail: `Gathered live intelligence on: ${query}`, data: info };
        } catch (err) {
            console.error('[Researcher] Perplexity search failed, falling back to internal LLM:', err);
            // Fallback to default LLM if Perplexity fails
            const prompt = `Research Query: "${query}". Provide a concise summary of technical best practices or facts regarding this query.`;
            const response = await callLlm({
                messages: [{ role: 'user', content: prompt }]
            });
            const info = response.choices ? response.choices[0].message.content : response.response.content;
            return { success: true, detail: `Gathered internal intelligence on: ${query}`, data: info };
        }
    }
}

module.exports = new Researcher();

