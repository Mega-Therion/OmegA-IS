/**
 * gAIng Orchestrator
 * The dispatcher that assigns tasks to agents based on their strengths
 *
 * Primary operator: Gemini (but any agent can run this)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Agent capability mapping - what each agent is good at
const AGENT_CAPABILITIES = {
    claude: {
        keywords: ['refactor', 'debug', 'architect', 'complex', 'review', 'analyze', 'design', 'implement feature', 'fix bug'],
        complexity: ['complex', 'epic'],
        priority: 1 // Higher = preferred for matching tasks
    },
    gemini: {
        keywords: ['plan', 'coordinate', 'research', 'explore', 'multimodal', 'image', 'video', 'orchestrate'],
        complexity: ['medium', 'complex'],
        priority: 2
    },
    codex: {
        keywords: ['quick', 'edit', 'script', 'shell', 'file', 'simple', 'rename', 'move', 'create file'],
        complexity: ['trivial', 'simple', 'medium'],
        priority: 3
    },
    grok: {
        keywords: ['search', 'current', 'real-time', 'news', 'twitter', 'x.com', 'latest'],
        complexity: ['simple', 'medium'],
        priority: 4
    },
    copilot: {
        keywords: ['autocomplete', 'boilerplate', 'inline', 'suggestion'],
        complexity: ['trivial', 'simple'],
        priority: 5
    }
};

/**
 * Find the best agent for a task based on description and complexity
 */
async function findBestAgent(task) {
    // Get available agents
    const { data: agents, error } = await supabase
        .from('agent_workload')
        .select('*')
        .in('status', ['online', 'busy'])
        .eq('is_responsive', true);

    if (error || !agents?.length) {
        console.log('No available agents found');
        return null;
    }

    const taskText = `${task.title} ${task.description || '}`.toLowerCase();
    const scores = {};

    for (const agent of agents) {
        const caps = AGENT_CAPABILITIES[agent.id];
        if (!caps) continue;

        let score = 0;

        // Keyword matching
        for (const keyword of caps.keywords) {
            if (taskText.includes(keyword)) {
                score += 10;
            }
        }

        // Complexity matching
        if (caps.complexity.includes(task.complexity || 'medium')) {
            score += 5;
        }

        // Prefer agents with fewer active tasks
        score -= (agent.active_tasks || 0) * 3;

        // Agent priority (preference)
        score += (6 - caps.priority);

        scores[agent.id] = score;
    }

    // Find highest scoring available agent
    const sorted = Object.entries(scores)
        .filter(([_, score]) => score > 0)
        .sort((a, b) => b[1] - a[1]);

    if (sorted.length > 0) {
        return sorted[0][0]; // Return agent id
    }

    // Fallback to first available
    return agents[0]?.id || null;
}

/**
 * Break down a complex task into subtasks
 */
function generateSubtasks(task) {
    // This is a simple heuristic - in production, you'd call an LLM
    const subtasks = [];
    const description = (task.description || task.title).toLowerCase();

    // Common patterns for breakdown
    if (description.includes('implement') || description.includes('build') || description.includes('create')) {
        subtasks.push({
            title: `Research existing code for: ${task.title}`,
            complexity: 'simple',
            suggestedAgent: 'codex'
        });
        subtasks.push({
            title: `Implement core logic for: ${task.title}`,
            complexity: 'complex',
            suggestedAgent: 'claude'
        });
        subtasks.push({
            title: `Write tests for: ${task.title}`,
            complexity: 'medium',
            suggestedAgent: 'claude'
        });
    }

    if (description.includes('refactor')) {
        subtasks.push({
            title: `Analyze current implementation`,
            complexity: 'medium',
            suggestedAgent: 'claude'
        });
        subtasks.push({
            title: `Execute refactoring`,
            complexity: 'complex',
            suggestedAgent: 'claude'
        });
        subtasks.push({
            title: `Verify no regressions`,
            complexity: 'simple',
            suggestedAgent: 'codex'
        });
    }

    return subtasks;
}

/**
 * Assign a task to an agent
 */
async function assignTask(taskId, agentId) {
    const { error } = await supabase
        .from('tasks')
        .update({
            assigned_to: agentId,
            assigned_at: new Date().toISOString(),
            status: 'assigned'
        })
        .eq('id', taskId);

    if (error) {
        console.error('Failed to assign task:', error);
        return false;
    }

    // Log to task_updates
    await supabase.from('task_updates').insert({
        task_id: taskId,
        agent_id: 'orchestrator',
        update_type: 'progress',
        content: `Task assigned to ${agentId}`
    });

    console.log(`Assigned task ${taskId} to ${agentId}`);
    return true;
}

/**
 * Check for file lock conflicts
 */
async function checkFileLocks(files, agentId) {
    if (!files?.length) return { clear: true, conflicts: [] };

    const { data: locks } = await supabase
        .from('file_locks')
        .select('*')
        .in('file_path', files)
        .gt('expires_at', new Date().toISOString());

    const conflicts = locks?.filter(l => l.locked_by !== agentId) || [];
    return {
        clear: conflicts.length === 0,
        conflicts
    };
}

/**
 * Main orchestration loop
 */
async function orchestrate() {
    console.log('\n=== gAIng Orchestrator Running ===\n');

    // 1. Get tasks that need planning (complex tasks from Safa)
    const { data: needsPlanning } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'planning')
        .is('parent_task_id', null);

    for (const task of needsPlanning || []) {
        console.log(`Planning task: ${task.title}`);
        const subtasks = generateSubtasks(task);

        for (let i = 0; i < subtasks.length; i++) {
            const sub = subtasks[i];
            const deps = i > 0 ? [subtasks[i - 1].id] : null;

            await supabase.from('tasks').insert({
                title: sub.title,
                parent_task_id: task.id,
                complexity: sub.complexity,
                dependencies: deps,
                created_by: 'orchestrator',
                status: 'pending'
            });
        }

        // Mark parent as waiting
        await supabase
            .from('tasks')
            .update({ status: 'blocked' })
            .eq('id', task.id);
    }

    // 2. Get available tasks and assign them
    const { data: availableTasks } = await supabase
        .from('available_tasks')
        .select('*')
        .limit(10);

    for (const task of availableTasks || []) {
        const agentId = await findBestAgent(task);
        if (agentId) {
            await assignTask(task.id, agentId);
        } else {
            console.log(`No suitable agent for: ${task.title}`);
        }
    }

    // 3. Check for completed subtasks -> complete parent
    const { data: blockedParents } = await supabase
        .from('tasks')
        .select('id')
        .eq('status', 'blocked')
        .not('parent_task_id', 'is', null);

    // This is simplified - real logic would check all children

    // 4. Clean up expired file locks
    await supabase
        .from('file_locks')
        .delete()
        .lt('expires_at', new Date().toISOString());

    console.log('\n=== Orchestration cycle complete ===\n');
}

/**
 * Heartbeat - mark orchestrator as alive
 */
async function heartbeat(agentId = 'gemini') {
    await supabase
        .from('agents')
        .update({
            status: 'online',
            last_heartbeat: new Date().toISOString()
        })
        .eq('id', agentId);
}

// Run modes
const mode = process.argv[2] || 'once';

if (mode === 'watch') {
    // Continuous mode - run every 30 seconds
    console.log('Starting orchestrator in watch mode...');
    setInterval(async () => {
        await heartbeat();
        await orchestrate();
    }, 30000);

    // Initial run
    heartbeat().then(orchestrate);
} else {
    // Single run
    orchestrate().then(() => process.exit(0));
}

module.exports = { orchestrate, findBestAgent, assignTask, checkFileLocks };
