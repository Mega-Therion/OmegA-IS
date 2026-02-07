const Redis = require('ioredis');

class TaskQueue {
  constructor(redisUrl = process.env.REDIS_URL) {
    if (!redisUrl) {
      console.warn('[TaskQueue] REDIS_URL not set; queue disabled.');
      this.enabled = false;
      return;
    }

    this.redis = new Redis(redisUrl);
    this.enabled = true;
    this.pubsub = new Redis(redisUrl); // Separate connection for pub/sub
  }

  // Enqueue a task with priority (higher = more urgent)
  // task: { id, type, priority: 1-10, sender, intent, data, deadline? }
  async enqueue(task) {
    if (!this.enabled) {
      throw new Error('Task queue not configured; set REDIS_URL');
    }

    const score = (10 - (task.priority || 5)) * 1000 + Date.now(); // Lower priority = higher score = processed later
    await this.redis.zadd(`queue:${task.type || 'default'}`, score, JSON.stringify(task));

    // Publish notification
    await this.redis.publish('task:new', JSON.stringify(task));
  }

  // Dequeue the next task (highest priority)
  async dequeue(taskType = 'default') {
    if (!this.enabled) {
      throw new Error('Task queue not configured; set REDIS_URL');
    }

    const tasks = await this.redis.zrange(`queue:${taskType}`, 0, 0, 'WITHSCORES');
    if (tasks.length === 0) return null;

    const task = JSON.parse(tasks[0]);
    await this.redis.zrem(`queue:${taskType}`, tasks[0]);

    return task;
  }

  // Get tasks by deadline (for real-time priority)
  async getUrgent(taskType = 'default', withinSeconds = 300) {
    if (!this.enabled) {
      throw new Error('Task queue not configured; set REDIS_URL');
    }

    const now = Date.now();
    const threshold = now + withinSeconds * 1000;

    const tasks = await this.redis.zrange(
      `queue:${taskType}`,
      0,
      -1,
      'WITHSCORES'
    );

    return tasks
      .reduce((acc, val, i) => {
        if (i % 2 === 0) {
          acc.push([JSON.parse(val), parseInt(tasks[i + 1])]);
        }
        return acc;
      }, [])
      .filter(([task, score]) => task.deadline && task.deadline <= threshold);
  }

  // Subscribe to task notifications
  async subscribe(handler) {
    if (!this.enabled) {
      throw new Error('Task queue not configured; set REDIS_URL');
    }

    await this.pubsub.subscribe('task:new', 'task:complete');
    this.pubsub.on('message', (channel, message) => {
      handler({ channel, data: JSON.parse(message) });
    });
  }

  // Mark task as complete
  async complete(taskId, result) {
    if (!this.enabled) {
      throw new Error('Task queue not configured; set REDIS_URL');
    }

    await this.redis.set(`task:result:${taskId}`, JSON.stringify(result), 'EX', 86400); // Expire in 24h
    await this.redis.publish('task:complete', taskId);
  }

  // Get task result
  async getResult(taskId) {
    if (!this.enabled) {
      throw new Error('Task queue not configured; set REDIS_URL');
    }

    const result = await this.redis.get(`task:result:${taskId}`);
    return result ? JSON.parse(result) : null;
  }

  // Get queue stats
  async stats(taskType = 'default') {
    if (!this.enabled) {
      return { enabled: false };
    }

    const count = await this.redis.zcard(`queue:${taskType}`);
    return { taskType, count, enabled: true };
  }
}

module.exports = new TaskQueue();
