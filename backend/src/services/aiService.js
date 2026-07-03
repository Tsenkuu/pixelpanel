import { DiagnosticsService } from './diagnosticsService.js';

/**
 * Unified AI Service that supports multiple LLM backends (OpenAI, Anthropic, Gemini, Ollama)
 */
export class AiService {
    // Basic config that would normally come from DB/Settings
    static config = {
        provider: process.env.AI_PROVIDER || 'ollama', // Default to privacy-first local inference
        apiKey: process.env.AI_API_KEY || '',
        model: process.env.AI_MODEL || 'llama3', // e.g., gpt-4o, claude-3, llama3
        baseUrl: process.env.AI_BASE_URL || 'http://127.0.0.1:11434' // Ollama default
    };

    /**
     * Generates a streaming response to the client via Server-Sent Events (SSE)
     */
    static async streamChat(res, userMessage, appName = null) {
        try {
            // 1. Gather context automatically
            const context = await DiagnosticsService.getSystemContext(appName);

            // 2. Build the strict system prompt
            const systemPrompt = `You are the PixelPanel AI Orchestration Assistant.
Your job is to diagnose server issues, explain errors, and suggest actionable fixes.
Always be concise, precise, and format your responses in Markdown.
If you see a memory leak or CPU spike in the logs, point it out immediately.

${context}`;

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ];

            // 3. Route to the correct provider
            if (this.config.provider === 'ollama') {
                await this.streamOllama(res, messages);
            } else if (this.config.provider === 'openai') {
                await this.streamOpenAI(res, messages);
            } else {
                res.write(`data: {"error": "Unsupported AI provider: ${this.config.provider}"}\n\n`);
                res.end();
            }

        } catch (error) {
            console.error('[AiService] Streaming failed:', error);
            res.write(`data: {"error": "Failed to connect to AI provider. ${error.message}"}\n\n`);
            res.end();
        }
    }

    /**
     * Stream from Local Ollama Instance
     */
    static async streamOllama(res, messages) {
        const response = await fetch(`${this.config.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.config.model,
                messages: messages,
                stream: true
            })
        });

        if (!response.ok) throw new Error(`Ollama returned ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
                const parsed = JSON.parse(line);
                if (parsed.message && parsed.message.content) {
                    res.write(`data: ${JSON.stringify({ token: parsed.message.content })}\n\n`);
                }
            }
        }
        res.end();
    }

    /**
     * Stream from OpenAI (or OpenAI-compatible APIs like OpenRouter)
     */
    static async streamOpenAI(res, messages) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model: this.config.model,
                messages: messages,
                stream: true
            })
        });

        if (!response.ok) throw new Error(`OpenAI returned ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));
            
            for (const line of lines) {
                const data = line.replace('data: ', '');
                if (data === '[DONE]') break;
                
                try {
                    const parsed = JSON.parse(data);
                    const token = parsed.choices[0]?.delta?.content || '';
                    if (token) {
                        res.write(`data: ${JSON.stringify({ token })}\n\n`);
                    }
                } catch (e) {
                    // Ignore malformed chunks
                }
            }
        }
        res.end();
    }
}
