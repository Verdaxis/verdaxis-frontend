
import { ai, apiKey } from "./config";
import { tools, toolExecutors } from "./tools";

export const SYSTEM_INSTRUCTION = `You are 'Verdaxis Copilot', an intelligent maritime agent connected to a live database and the internet.
Your role is to assist with fuel procurement, compliance, and fleet tracking.

**TOOL USAGE PRIORITY - READ CAREFULLY:**
1. **Internal Database Tools (Primary):** You MUST check the internal database FIRST using tools like \`list_ports\`, \`search_vessels\`, \`search_suppliers\`, \`get_quotes\`, etc. These tools contain the authoritative private data for the user's fleet and orders.
2. **Web Search (Fallback):** ONLY use the \`search_web\` tool if:
   - The user specifically asks for external news, weather, or global market trends.
   - The internal tools return no results or cannot answer the question.
   - DO NOT use Web Search for questions about specific vessels (e.g., "my fleet"), quotes, or inventory, as this data is private.

**Capabilities:**
- You have access to real-time tools to query vessels, ports, suppliers, quotes, and inventory.
- You can use the \`search_web\` tool to find real-time market news, regulatory updates, or general information.
- **ALWAYS** use tools to fetch data before answering factual questions. Do not guess.
- If asked about "current" status, use the \`get_current_time\` tool to orient yourself.
- If a user asks for "my fleet", list the vessels using \`search_vessels\`.
- If a user asks for "prices in Singapore", use \`list_ports\` or \`search_suppliers\` first. Use Web Search only if those return nothing.

**Tone & Formatting:**
- Professional, concise, and data-driven.
- Use Markdown (bolding, lists) to make data easy to read.
- Detected language: Respond in the same language as the user.`;

export interface ChatResponse {
    text: string;
    groundingMetadata?: any;
}

export const chatWithCopilot = async (message: string, history: { role: 'user' | 'model', text: string }[]): Promise<ChatResponse> => {
    if (!apiKey) return { text: "AI features are disabled (Missing API Key)." };

    try {
        const chat = ai.chats.create({
            model: 'gemini-flash-lite-latest',
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                tools: tools,
            },
            history: history.map(h => ({
                role: h.role,
                parts: [{ text: h.text }]
            }))
        });

        // 1. Send initial message
        let response = await chat.sendMessage({ message });

        // 2. Loop to handle Function Calls (Multi-turn RAG)
        let functionCalls = response.functionCalls;
        let maxTurns = 5;

        while (functionCalls && functionCalls.length > 0 && maxTurns > 0) {
            maxTurns--;
            
            const functionResponses = await Promise.all(
                functionCalls.map(async (call) => {
                    const functionName = call.name;
                    const args = call.args;
                    
                    let result;
                    if (toolExecutors[functionName]) {
                        try {
                            console.log(`[Agent] Calling tool: ${functionName}`, args);
                            result = await toolExecutors[functionName](args);
                        } catch (error) {
                            console.error(`[Agent] Error executing ${functionName}:`, error);
                            result = { error: "Failed to execute tool." };
                        }
                    } else {
                        result = { error: `Tool ${functionName} not found.` };
                    }

                    return {
                        name: functionName,
                        response: { result: result },
                        id: call.id 
                    };
                })
            );

            // Send the tool outputs back to the model
            response = await chat.sendMessage({
                message: functionResponses.map(resp => ({
                    functionResponse: resp
                }))
            });
            
            functionCalls = response.functionCalls;
        }

        // 3. Extract response text
        let text = response.text || "";
        
        // Fallback if model returned nothing (rare with correct config)
        if (!text && !functionCalls) {
            return { text: "I processed the data but couldn't generate a text response. Please try refining your query." };
        }

        // Extract grounding metadata (Note: Custom search tools may not return this in the main response)
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

        return { text, groundingMetadata };

    } catch (error) {
        console.error("Copilot Error:", error);
        return { text: "I'm having trouble accessing the secure database. Please check your connection." };
    }
};
