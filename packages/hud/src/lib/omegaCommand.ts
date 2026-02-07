/**
 * OMEGA Command Handler for Jarvis
 * 
 * Drop-in helper for a Jarvis command-driven UI.
 * Usage (in your command handler):
 *   if (cmd === "/omega") return await handleOmegaCommand(args.join(" "));
 */

import { omegaChat, omegaMemoryQuery, omegaMemoryUpsert } from "./omegaClient";

export type OmegaCommandResult = {
    success: boolean;
    output: string;
    mode?: string;
};

/**
 * Handle /omega command
 */
export async function handleOmegaCommand(userText: string): Promise<OmegaCommandResult> {
    try {
        const resp = await omegaChat({ user: userText });
        return {
            success: true,
            output: resp.reply,
            mode: resp.mode,
        };
    } catch (error) {
        return {
            success: false,
            output: `OMEGA Error: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}

/**
 * Handle /omega-remember command - Store a memory
 */
export async function handleOmegaRemember(content: string, namespace = "default"): Promise<OmegaCommandResult> {
    try {
        const result = await omegaMemoryUpsert({ content, namespace });
        return {
            success: true,
            output: `Memory stored with ID: ${result.id}`,
        };
    } catch (error) {
        return {
            success: false,
            output: `Failed to store memory: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}

/**
 * Handle /omega-recall command - Query memories
 */
export async function handleOmegaRecall(query: string, namespace = "default", k = 5): Promise<OmegaCommandResult> {
    try {
        const result = await omegaMemoryQuery({ query, namespace, k });
        if (result.hits.length === 0) {
            return { success: true, output: "No relevant memories found." };
        }

        const formatted = result.hits
            .map((h, i) => `${i + 1}. (${(h.score * 100).toFixed(1)}%) ${h.content.slice(0, 100)}...`)
            .join("\n");

        return {
            success: true,
            output: `Found ${result.hits.length} memories:\n${formatted}`,
        };
    } catch (error) {
        return {
            success: false,
            output: `Failed to query memories: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
