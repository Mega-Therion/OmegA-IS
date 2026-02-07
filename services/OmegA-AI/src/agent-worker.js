/**
 * gAIng Agent Worker Template
 * Each agent runs this to poll for and execute assigned tasks
 *
 * Usage: node agent-worker.js <agent-id>
 * Example: node agent-worker.js claude
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const AGENT_ID = process.argv[2] || 'claude';
const LOG_FILE = path.join(__dirname, '..', 'log.md');

/**
 * Log to the block (log.md)
 */
function logToBlock(message) {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const entry = `- ${timestamp} [${AGENT_ID.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, entry);
    console.log(entry.trim());
}

/**
 * Update agent heartbeat
 */
async function heartbeat(status = 'online') {
    await supabase
        .from('agents')
        .update({
            status,
            last_heartbeat: new Date().toISOString()
        })
        .eq('id', AGENT_ID);
}

/**
 * Get next assigned task for this agent
 */
async function getNextTask() {
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', AGENT_ID)
        .in('status', ['assigned', 'in_progress'])
        .order('priority', { ascending: true })
        .order('assigned_at', { ascending: true })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('Error fetching task:', error);
    }
    return data;
}

/**
 * Acquire file locks for a task
 */
async function acquireLocks(taskId, files) {
    if (!files?.length) return true;

    const locks = files.map(f => ({
        file_path: f,
        locked_by: AGENT_ID,
        task_id: taskId,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    }));

    const { error } = await supabase
        .from('file_locks')
        .upsert(locks, { onConflict: 'file_path' });

    return !error;
}

/**
 * Release file locks
 */
async function releaseLocks(taskId) {
    await supabase
        .from('file_locks')
        .delete()
        .eq('task_id', taskId);
}

/**
 * Update task status
 */
async function updateTask(taskId, updates) {
    const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

    if (error) {
        console.error('Failed to update task:', error);
    }
    return !error;
}

/**
 * Post an update/progress note
 */
async function postUpdate(taskId, type, content) {
    await supabase.from('task_updates').insert({
        task_id: taskId,
        agent_id: AGENT_ID,
        update_type: type,
        content
    });
}

/**
 * Mark task as started
 */
async function startTask(task) {
    await updateTask(task.id, {
        status: 'in_progress',
        started_at: new Date().toISOString()
    });
    await heartbeat('busy');
    await postUpdate(task.id, 'progress', 'Started working on task');
    logToBlock(`Started: ${task.title}`);
}

/**
 * Mark task as completed
 */
async function completeTask(task, result) {
    await updateTask(task.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        result
    });
    await releaseLocks(task.id);
    await heartbeat('online');
    await postUpdate(task.id, 'completion', result || 'Task completed');
    logToBlock(`Completed: ${task.title}`);

    // Check if this completes a parent task
    if (task.parent_task_id) {
        await checkParentCompletion(task.parent_task_id);
    }
}

/**
 * Mark task as failed
 */
async function failTask(task, errorMessage) {
    await updateTask(task.id, {
        status: 'failed',
        error_message: errorMessage
    });
    await releaseLocks(task.id);
    await heartbeat('online');
    await postUpdate(task.id, 'blocker', errorMessage);
    logToBlock(`Failed: ${task.title} - ${errorMessage}`);
}

/**
 * Check if all subtasks are done -> complete parent
 */
async function checkParentCompletion(parentId) {
    const { data: subtasks } = await supabase
        .from('tasks')
        .select('status')
        .eq('parent_task_id', parentId);

    const allDone = subtasks?.every(t => t.status === 'completed');
    if (allDone) {
        await supabase
            .from('tasks')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', parentId);
        logToBlock(`Parent task ${parentId} completed (all subtasks done)`);
    }
}

/**
 * Main execution function - OVERRIDE THIS FOR YOUR AGENT
 * This is where the actual work happens
 */
async function executeTask(task) {
    // Default implementation just logs the task
    // Real agents would:
    // - Parse task.instructions
    // - Execute the work
    // - Return a result summary

    console.log('\n========================================');
    console.log('TASK RECEIVED:');
    console.log('----------------------------------------');
    console.log(`ID: ${task.id}`);
    console.log(`Title: ${task.title}`);
    console.log(`Description: ${task.description || '(none)'}`);
    console.log(`Instructions: ${task.instructions || '(none)'}`);
    console.log(`Complexity: ${task.complexity}`);
    console.log(`Priority: ${task.priority}`);
    console.log('========================================\n');

    // In CLI mode, this would be shown to the agent
    // The agent (Claude, Gemini, etc.) would then work on it

    return {
        success: true,
        result: 'Task acknowledged - awaiting agent execution'
    };
}

/**
 * Worker loop
 */
async function work() {
    console.log(`\n=== ${AGENT_ID.toUpperCase()} Worker Starting ===\n`);
    await heartbeat('online');
    logToBlock(`Agent online and listening for tasks`);

    const task = await getNextTask();

    if (!task) {
        console.log('No tasks assigned. Waiting...');
        return;
    }

    // Start the task
    await startTask(task);

    // Acquire any file locks
    if (task.locked_files?.length) {
        const locked = await acquireLocks(task.id, task.locked_files);
        if (!locked) {
            await failTask(task, 'Could not acquire file locks - files in use');
            return;
        }
    }

    try {
        // Execute the task
        const result = await executeTask(task);

        if (result.success) {
            await completeTask(task, result.result);
        } else {
            await failTask(task, result.error || 'Unknown error');
        }
    } catch (err) {
        await failTask(task, err.message);
    }
}

/**
 * CLI entry point
 */
async function main() {
    const mode = process.argv[3] || 'once';

    if (mode === 'watch') {
        // Continuous polling mode
        console.log(`Starting ${AGENT_ID} worker in watch mode...`);
        setInterval(async () => {
            await heartbeat();
            await work();
        }, 15000); // Check every 15 seconds

        // Initial run
        work();
    } else if (mode === 'status') {
        // Just show current status
        await heartbeat();
        const task = await getNextTask();
        if (task) {
            console.log(`Current task: ${task.title}`);
        } else {
            console.log('No active tasks');
        }
    } else {
        // Single check
        await work();
    }
}

main().catch(console.error);

// Export for use as module
module.exports = {
    getNextTask,
    startTask,
    completeTask,
    failTask,
    postUpdate,
    logToBlock,
    heartbeat
};
