const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

class Mission {
    constructor(objective) {
        this.id = randomUUID();
        this.objective = objective;
        this.status = 'PENDING'; // PENDING, PLANNING, ACTIVE, BLOCKED, COMPLETE, FAILED
        this.steps = [];
        this.context = {
            constraints: [],
            resources: []
        };
        this.decisionLog = [];
        this.createdAt = new Date().toISOString();
        this.updatedAt = this.createdAt;
        
        // Portable Path Logic
        const rootDir = process.env.VISION_ROOT || path.resolve(process.cwd(), '..');
        this.persistenceDir = path.resolve(rootDir, 'data', 'missions');
        
        // Ensure persistence dir exists
        if (!fs.existsSync(this.persistenceDir)) {
            fs.mkdirSync(this.persistenceDir, { recursive: true });
        }
    }

    static load(id) {
        // Portable Path Logic
        const rootDir = process.env.VISION_ROOT || path.resolve(process.cwd(), '..');
        const persistenceDir = path.resolve(rootDir, 'data', 'missions');
        const filePath = path.join(persistenceDir, `${id}.json`);

        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const mission = new Mission(data.objective);
            Object.assign(mission, data);
            return mission;
        }
        return null;
    }

    addStep(agent, instruction) {
        const step = {
            id: this.steps.length + 1,
            agent,
            instruction,
            status: 'pending',
            output: null
        };
        this.steps.push(step);
        this.save();
        return step;
    }

    updateStep(stepId, status, output = null) {
        const step = this.steps.find(s => s.id === stepId);
        if (step) {
            step.status = status;
            if (output) step.output = output;
            this.updatedAt = new Date().toISOString();
            this.save();
        }
    }

    setStatus(status) {
        this.status = status;
        this.updatedAt = new Date().toISOString();
        this.save();
    }

    logDecision(context, decision) {
        this.decisionLog.push({
            timestamp: new Date().toISOString(),
            context,
            decision
        });
        this.save();
    }

    save() {
        const filePath = path.join(this.persistenceDir, `${this.id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(this, null, 2));
    }
}

module.exports = Mission;
