const { spawn } = require('child_process');
const blackboard = require('../services/blackboard');
const Mission = require('./mission');
const workers = require('../workers');

class Brain {
    constructor() {
        this.isProcessing = false;
        this.taskQueue = [];
        this.activeMission = null;
    }

    async awaken() {
        console.log('[Brain] Awakening...');
        blackboard.init();
        blackboard.broadcast('AWAKE', 'Vision is online. Listening for signals.');

        // Bind Signals
        blackboard.on('command', (cmd) => this.handleCommand(cmd));
        blackboard.on('user_msg', (msg) => this.handleThought(msg));

        console.log('[Brain] Core logic active. Waiting for input.');
    }

    async handleCommand(command) {
        const cmd = command.trim().toUpperCase();
        
        if (cmd === 'GO' && this.activeMission) {
            this.runMission();
        } else {
            console.log(`[Brain] Executing Shell: ${command}`);
            blackboard.broadcast('ACTING', `Executing: ${command}`);
            this.executeShell(command);
        }
    }

    async handleThought(msg) {
        console.log(`[Brain] Pondering: ${msg}`);
        blackboard.broadcast('THINKING', `Analyzing request: ${msg}`);

        // 1. Create Mission
        this.activeMission = new Mission(msg);
        blackboard.write(`MISSION STARTED [${this.activeMission.id}]: ${msg}`);
        
        // 2. Plan Mission
        this.activeMission.setStatus('PLANNING');
        const planResult = await workers.planner.execute(this.activeMission);

        if (planResult.success) {
            blackboard.broadcast('PLAN_READY', `Created ${this.activeMission.steps.length} step plan.`);
            
            let planText = `\n## PLAN: ${msg}\n`;
            this.activeMission.steps.forEach(s => {
                planText += `- [ ] [${s.agent}] ${s.instruction}\n`;
            });
            planText += `\n**Type "- cmd: GO" to execute the plan.**`;
            blackboard.write(planText);
            
            blackboard.broadcast('IDLE', 'Plan created. Waiting for GO.');
        } else {
            blackboard.broadcast('ERROR', `Planning failed: ${planResult.error}`);
            blackboard.write(`PLANNING FAILED: ${planResult.error}`);
        }
    }

    async runMission() {
        if (!this.activeMission || this.isProcessing) return;
        this.isProcessing = true;
        
        blackboard.broadcast('ACTING', 'Executing Mission Steps...');
        this.activeMission.setStatus('ACTIVE');

        for (const step of this.activeMission.steps) {
            if (step.status !== 'pending') continue;

            blackboard.broadcast('WORKING', `[${step.agent}] ${step.instruction}`);
            this.activeMission.updateStep(step.id, 'processing');

            const worker = workers[step.agent];
            if (!worker) {
                console.error(`[Brain] No worker found for agent: ${step.agent}`);
                this.activeMission.updateStep(step.id, 'failed', 'Worker not found');
                continue;
            }

            const result = await worker.execute(this.activeMission, step);

            if (result.success) {
                this.activeMission.updateStep(step.id, 'complete', result.detail);
                blackboard.write(`Step ${step.id} Complete: ${step.instruction}`);
            } else {
                this.activeMission.updateStep(step.id, 'failed', result.error);
                blackboard.write(`Step ${step.id} Failed: ${result.error}`);
                this.activeMission.setStatus('BLOCKED');
                break; 
            }
        }

        const allComplete = this.activeMission.steps.every(s => s.status === 'complete');
        if (allComplete) {
            this.activeMission.setStatus('COMPLETE');
            blackboard.broadcast('DONE', 'Mission Objective Reached.');
            blackboard.write(`MISSION COMPLETE: ${this.activeMission.objective}`);
        }

        this.isProcessing = false;
        this.activeMission = null;
    }

    executeShell(cmd) {
        const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
        const args = process.platform === 'win32' ? ['-Command', cmd] : ['-c', cmd];
        const proc = spawn(shell, args);

        proc.stdout.on('data', (data) => console.log(`[Shell] ${data.toString().trim()}`));
        proc.on('close', (code) => {
            blackboard.broadcast('IDLE', `Command finished (Exit: ${code})`);
            blackboard.write(`Executed: ${cmd} (Exit: ${code})`);
        });
    }
}

module.exports = new Brain();

