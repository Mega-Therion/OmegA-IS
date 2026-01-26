const supabase = require('./supabase');
const queue = require('./queue');

const PRIORITY_MAP = {
  low: 3,
  medium: 5,
  high: 8,
  critical: 10,
};

async function intakeTask({ message, priority = 'medium', complexity, createdBy = 'system', source = 'api' }) {
  if (!message) {
    throw new Error('message is required');
  }

  const isComplex = complexity === 'complex' ||
    complexity === 'epic' ||
    message.length > 200 ||
    /\b(and|then|also|multiple|several)\b/i.test(message);

  const taskPayload = {
    title: message.slice(0, 100) + (message.length > 100 ? '...' : ''),
    description: message,
    source_message: message,
    status: isComplex ? 'planning' : 'pending',
    priority: priority || 'medium',
    complexity: complexity || (isComplex ? 'complex' : 'medium'),
    created_by: createdBy,
    source,
  };

  const { data: task, error } = await supabase
    .from('tasks')
    .insert([taskPayload])
    .select()
    .single();

  if (error) {
    throw error;
  }

  let queued = false;
  if (queue?.enabled) {
    try {
      const numericPriority = PRIORITY_MAP[priority] || 5;
      await queue.enqueue({
        id: task.id,
        type: 'intake',
        priority: numericPriority,
        sender: createdBy,
        intent: 'task_intake',
        data: { message, taskId: task.id, source },
      });
      queued = true;
    } catch (err) {
      // Non-fatal if queue is down.
      console.warn('[TaskIntake] Queue enqueue failed:', err.message);
    }
  }

  return { task, queued };
}

module.exports = { intakeTask };
