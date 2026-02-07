const supabase = require('./supabase');
const llm = require('./llm-enhanced');

async function createEpisode({ ownerId, memoryIds, summary, tags = [] }) {
  if (!memoryIds || memoryIds.length === 0) {
    throw new Error('memoryIds required');
  }

  const { data: memories, error } = await supabase
    .from('memories')
    .select('*')
    .in('id', memoryIds)
    .eq('owner_id', ownerId);

  if (error) throw error;

  const timestamps = memories.map(m => new Date(m.created_at)).sort((a, b) => a - b);
  const metadata = {
    episode: {
      start: timestamps[0]?.toISOString(),
      end: timestamps[timestamps.length - 1]?.toISOString(),
      memoryIds,
    },
  };

  const content = summary || memories.map(m => m.content).join('\n');
  const { data: created, error: insertError } = await supabase
    .from('memories')
    .insert([{
      owner_id: ownerId,
      user_id: ownerId,
      content,
      tags: Array.from(new Set(['episode', ...tags])),
      metadata,
    }])
    .select()
    .single();

  if (insertError) throw insertError;
  return created;
}

async function consolidateMemories({ ownerId, olderThanDays = 30, limit = 50 }) {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
  const { data: memories, error } = await supabase
    .from('memories')
    .select('*')
    .eq('owner_id', ownerId)
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  if (!memories || memories.length === 0) {
    return { consolidated: false, reason: 'No memories to consolidate' };
  }

  let summary = memories.map(m => `- ${m.content}`).join('\n');
  const status = llm.getLlmStatus();
  if (status.ready) {
    const response = await llm.callLlm({
      messages: [{
        role: 'user',
        content: `Summarize these memories into a concise consolidation note:\n${summary}`,
      }],
      temperature: 0.2,
      maxTokens: 500,
    });
    summary = response?.choices?.[0]?.message?.content || summary;
  }

  const episode = await createEpisode({
    ownerId,
    memoryIds: memories.map(m => m.id),
    summary,
    tags: ['consolidated'],
  });

  for (const memory of memories) {
    await supabase
      .from('memories')
      .update({ metadata: { ...(memory.metadata || {}), consolidated_to: episode.id } })
      .eq('id', memory.id);
  }

  return { consolidated: true, episode };
}

async function pruneMemories({ ownerId, olderThanDays = 90, limit = 100 }) {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
  const { data: memories, error } = await supabase
    .from('memories')
    .select('*')
    .eq('owner_id', ownerId)
    .lt('created_at', cutoff)
    .limit(limit);

  if (error) throw error;

  const pruned = [];
  for (const memory of memories) {
    const metadata = { ...(memory.metadata || {}), archived: true, archived_at: new Date().toISOString() };
    await supabase.from('memories').update({ metadata }).eq('id', memory.id);
    pruned.push(memory.id);
  }

  return { pruned };
}

async function getProvenance(memoryId) {
  const sources = await supabase
    .from('memory_sources')
    .select('*')
    .eq('memory_id', memoryId);

  const revisions = await supabase
    .from('memory_revisions')
    .select('*')
    .eq('memory_id', memoryId)
    .order('created_at', { ascending: false });

  return {
    sources: sources.data || [],
    revisions: revisions.data || [],
  };
}

async function getRevisions(memoryId) {
  const { data, error } = await supabase
    .from('memory_revisions')
    .select('*')
    .eq('memory_id', memoryId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function restoreRevision({ ownerId, memoryId, revisionId }) {
  const { data: revision, error } = await supabase
    .from('memory_revisions')
    .select('*')
    .eq('id', revisionId)
    .eq('memory_id', memoryId)
    .single();

  if (error || !revision) throw new Error('revision not found');

  const { data: updated, error: updateError } = await supabase
    .from('memories')
    .update({ content: revision.previous_content })
    .eq('id', memoryId)
    .eq('owner_id', ownerId)
    .select()
    .single();

  if (updateError) throw updateError;
  return updated;
}

module.exports = {
  createEpisode,
  consolidateMemories,
  pruneMemories,
  getProvenance,
  getRevisions,
  restoreRevision,
};
