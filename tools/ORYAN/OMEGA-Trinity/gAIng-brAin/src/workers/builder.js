const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const Worker = require('../core/worker');
const { callLlm } = require('../services/llm');

class Builder extends Worker {
    constructor() {
        super('Codex', 'Builder');
    }

    async execute(mission, step) {
        console.log(`[Builder] Executing step: ${step.instruction}`);
        
        // Use LLM to determine if this is a Code Write or a Shell Command
        const prompt = `
        You are the Builder (Codex). 
        Mission Objective: "${mission.objective}"
        Current Instruction: "${step.instruction}"
        
        Decide if this task requires writing a file or running a shell command.
        
        Return JSON ONLY:
        {
            "action": "WRITE_FILE" | "RUN_COMMAND",
            "path": "path/to/file.js", // If WRITE_FILE
            "content": "code here",     // If WRITE_FILE
            "command": "shell command" // If RUN_COMMAND
        }
        `;

        try {
            const response = await callLlm({
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1
            });

            const contentStr = response.choices ? response.choices[0].message.content : response.response.content;
            const actionPlan = JSON.parse(contentStr.replace(/```json/g, ').replace(/```/g, ').trim());

            if (actionPlan.action === 'WRITE_FILE') {
                return await this.writeFile(actionPlan.path, actionPlan.content);
            } else if (actionPlan.action === 'RUN_COMMAND') {
                return await this.runCommand(actionPlan.command);
            }

            return { success: false, error: 'Unknown action type' };

        } catch (err) {
            console.error('[Builder] Execution failed:', err);
            return { success: false, error: err.message };
        }
    }

    async writeFile(filePath, content) {
        try {
            const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
            const dir = path.dirname(absolutePath);
            
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(absolutePath, content);
            console.log(`[Builder] Wrote file: ${filePath}`);
            return { success: true, detail: `Wrote ${content.length} characters to ${filePath}` };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    runCommand(cmd) {
        return new Promise((resolve) => {
            const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
            const args = process.platform === 'win32' ? ['-Command', cmd] : ['-c', cmd];
            const proc = spawn(shell, args);

            let output = '';
            proc.stdout.on('data', (data) => output += data.toString());
            proc.stderr.on('data', (data) => output += data.toString());

            proc.on('close', (code) => {
                resolve({ 
                    success: code === 0, 
                    detail: output.trim() || `Process exited with code ${code}` 
                });
            });
        });
    }
}

module.exports = new Builder();

