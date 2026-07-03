import { TemplateService } from '../services/templateService.js';

export class TemplateController {
    static getTemplates(req, res) {
        try {
            const templates = TemplateService.getTemplates();
            res.json(templates);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async deployTemplate(req, res) {
        const { templateId, domain, appName } = req.body;
        
        if (!templateId || !domain || !appName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        try {
            // We run this asynchronously so we don't block the HTTP request.
            // Progress is streamed back via the EventBus -> WebSockets
            TemplateService.deployTemplate(templateId, domain, appName)
                .catch(err => console.error('[TemplateController] Deployment failed:', err));
                
            res.json({ success: true, message: 'Deployment orchestrated. Monitoring progress via WebSocket.' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
