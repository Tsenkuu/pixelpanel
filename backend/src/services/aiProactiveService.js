import EventBus from './eventBus.js';
import { DiagnosticsService } from './diagnosticsService.js';
import { AiService } from './aiService.js';

export class AiProactiveService {
    /**
     * Initializes listeners on the global EventBus to autonomously
     * generate Root Cause Analyses (RCA) for system anomalies.
     */
    static initialize() {
        console.log('[AiProactiveService] Booting background anomaly detection hooks...');

        EventBus.subscribe('app.deploy.failed', async (payload) => {
            console.log(`[AiProactiveService] Intercepted deployment failure for ${payload.appName}. Analyzing...`);
            await this.generateRCA(payload.appName, `The deployment for ${payload.appName} just failed with error: ${payload.error}. What is the root cause?`);
        });

        EventBus.subscribe('app.crash', async (payload) => {
            console.log(`[AiProactiveService] Intercepted crash for ${payload.appName}. Analyzing...`);
            await this.generateRCA(payload.appName, `The application ${payload.appName} just crashed unexpectedly. Based on the logs, why did this happen?`);
        });
        
        EventBus.subscribe('system.cpu.high', async (payload) => {
             console.log(`[AiProactiveService] Intercepted CPU spike. Analyzing...`);
             await this.generateRCA(null, `The system CPU load has spiked to ${payload.load}%. Analyze the current system context and pinpoint the offending process or potential issue.`);
        });
    }

    /**
     * Autonomously queries the local/remote LLM to generate an RCA report.
     * In a full implementation, this would push a Notification to the frontend via WebSocket.
     */
    static async generateRCA(appName, triggerPrompt) {
        try {
            const context = await DiagnosticsService.getSystemContext(appName);
            
            const systemPrompt = `You are the PixelPanel Automated Diagnostic Engine.
A critical system event has occurred. Analyze the context below and generate a concise Root Cause Analysis (RCA).
Format as Markdown. Propose an exact command or code fix if possible.

${context}`;

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: triggerPrompt }
            ];

            // For proactive background tasks, we don't stream to an HTTP response.
            // We use standard fetch and wait for the full generation to emit to the frontend.
            
            let fullResponse = '';
            
            if (AiService.config.provider === 'ollama') {
                 const res = await fetch(`${AiService.config.baseUrl}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: AiService.config.model,
                        messages: messages,
                        stream: false
                    })
                });
                const data = await res.json();
                fullResponse = data.message?.content || 'No RCA generated.';
            } else if (AiService.config.provider === 'openai') {
                 const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${AiService.config.apiKey}`
                    },
                    body: JSON.stringify({
                        model: AiService.config.model,
                        messages: messages,
                        stream: false
                    })
                });
                const data = await res.json();
                fullResponse = data.choices?.[0]?.message?.content || 'No RCA generated.';
            }

            // Emit the completed RCA back to the event bus so the WebSocket server can broadcast it
            // to the frontend NotificationCenter.
            EventBus.publish('ai.rca.completed', {
                appName: appName || 'System',
                report: fullResponse,
                timestamp: new Date()
            });
            
            console.log(`[AiProactiveService] RCA generation complete for ${appName || 'System'}.`);

        } catch (error) {
            console.error('[AiProactiveService] Failed to generate autonomous RCA:', error);
        }
    }
}
