import { AiService } from '../services/aiService.js';

export class AiController {
    /**
     * Handles the SSE connection for the AI Chat Assistant
     */
    static async chat(req, res) {
        // Setup SSE Headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        // Ensure reverse proxies don't buffer the stream
        res.setHeader('X-Accel-Buffering', 'no'); 

        const { message, appName } = req.body;

        if (!message) {
            res.write(`data: {"error": "Message is required"}\n\n`);
            return res.end();
        }

        try {
            await AiService.streamChat(res, message, appName);
        } catch (error) {
            console.error('[AiController] Error in chat stream:', error);
            if (!res.writableEnded) {
                res.write(`data: {"error": "Internal server error."}\n\n`);
                res.end();
            }
        }
    }
}
