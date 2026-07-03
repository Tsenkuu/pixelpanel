import { GitService } from './gitService.js';
import { PM2Service } from './pm2Service.js';
import { NginxService } from './nginxService.js';
import EventBus from './eventBus.js';
import db from '../repositories/db.js';
import fs from 'fs';
import path from 'path';

export const MARKETPLACE_TEMPLATES = [
    {
        id: 'express',
        name: 'Express.js',
        category: 'Framework',
        description: 'Fast, unopinionated, minimalist web framework for Node.js.',
        icon: 'https://raw.githubusercontent.com/npm/logos/master/express/express-logo.png', // Fallback to icons later
        estimatedRam: '40MB',
        estimatedCpu: 'Very Low',
        deployTime: '~15s',
        repo: 'https://github.com/expressjs/express-generator.git',
        startScript: 'npm start',
        env: { PORT: '3000', NODE_ENV: 'production' }
    },
    {
        id: 'nestjs',
        name: 'NestJS',
        category: 'Framework',
        description: 'A progressive Node.js framework for building efficient, reliable and scalable server-side applications.',
        icon: 'https://nestjs.com/logo-small.svg',
        estimatedRam: '80MB',
        estimatedCpu: 'Low',
        deployTime: '~30s',
        repo: 'https://github.com/nestjs/typescript-starter.git',
        startScript: 'npm run start:prod',
        buildScript: 'npm run build',
        env: { PORT: '3000', NODE_ENV: 'production' }
    },
    {
        id: 'nextjs',
        name: 'Next.js',
        category: 'Frontend',
        description: 'The React Framework for the Web.',
        icon: 'https://assets.vercel.com/image/upload/v1662130559/nextjs/Icon_dark_background.png',
        estimatedRam: '120MB',
        estimatedCpu: 'Medium',
        deployTime: '~45s',
        repo: 'https://github.com/vercel/next.js.git',
        startScript: 'npm run start',
        buildScript: 'npm run build',
        env: { PORT: '3000', NODE_ENV: 'production' }
    },
    {
        id: 'n8n',
        name: 'n8n',
        category: 'Automation',
        description: 'Free and open fair-code licensed node based Workflow Automation Tool.',
        icon: 'https://n8n.io/n8n-logo.png',
        estimatedRam: '250MB',
        estimatedCpu: 'Medium',
        deployTime: '~60s',
        repo: 'https://github.com/n8n-io/n8n.git', // In reality n8n is usually deployed via npm global, but we mock repo for structure
        startScript: 'n8n start',
        env: { N8N_PORT: '3000', WEBHOOK_URL: '' }
    },
    // Adding more templates from the user request
    { id: 'fastify', name: 'Fastify', category: 'Framework', description: 'Fast and low overhead web framework, for Node.js.', estimatedRam: '30MB', estimatedCpu: 'Very Low', deployTime: '~15s', repo: 'https://github.com/fastify/fastify-cli.git', startScript: 'npm start' },
    { id: 'vue', name: 'Vue', category: 'Frontend', description: 'The Progressive JavaScript Framework.', estimatedRam: 'Static', estimatedCpu: 'None', deployTime: '~20s', repo: 'https://github.com/vuejs/core.git', buildScript: 'npm run build', startScript: 'npx serve dist' },
    { id: 'nuxt', name: 'Nuxt', category: 'Frontend', description: 'The Intuitive Vue Framework.', estimatedRam: '100MB', estimatedCpu: 'Medium', deployTime: '~40s', repo: 'https://github.com/nuxt/nuxt.git', buildScript: 'npm run build', startScript: 'npm run start' },
    { id: 'wordpress', name: 'WordPress', category: 'CMS', description: 'Blog Tool, Publishing Platform, and CMS.', estimatedRam: '150MB', estimatedCpu: 'Low', deployTime: '~20s', repo: 'https://github.com/WordPress/WordPress.git', startScript: 'php -S 0.0.0.0:3000 -t .' }, // Native PHP fallback for STB
    { id: 'ghost', name: 'Ghost', category: 'CMS', description: 'Turn your audience into a business.', estimatedRam: '200MB', estimatedCpu: 'Medium', deployTime: '~45s', repo: 'https://github.com/TryGhost/Ghost.git', startScript: 'ghost start' },
    { id: 'strapi', name: 'Strapi', category: 'CMS', description: 'The leading open-source headless CMS.', estimatedRam: '250MB', estimatedCpu: 'High', deployTime: '~60s', repo: 'https://github.com/strapi/strapi.git', startScript: 'npm run start' },
    { id: 'pocketbase', name: 'PocketBase', category: 'Backend', description: 'Open Source realtime backend in 1 file.', estimatedRam: '30MB', estimatedCpu: 'Low', deployTime: '~10s', repo: 'https://github.com/pocketbase/pocketbase.git', startScript: './pocketbase serve' },
    { id: 'uptime-kuma', name: 'Uptime Kuma', category: 'Utility', description: 'A fancy self-hosted monitoring tool.', estimatedRam: '80MB', estimatedCpu: 'Low', deployTime: '~30s', repo: 'https://github.com/louislam/uptime-kuma.git', startScript: 'npm run start-server' },
    { id: 'umami', name: 'Umami', category: 'Utility', description: 'A simple, fast, privacy-focused alternative to Google Analytics.', estimatedRam: '100MB', estimatedCpu: 'Low', deployTime: '~40s', repo: 'https://github.com/umami-software/umami.git', startScript: 'npm start' },
    { id: 'directus', name: 'Directus', category: 'CMS', description: 'Open Data Platform.', estimatedRam: '200MB', estimatedCpu: 'Medium', deployTime: '~45s', repo: 'https://github.com/directus/directus.git', startScript: 'npx directus start' },
    { id: 'payload', name: 'PayloadCMS', category: 'CMS', description: 'The best way to build a modern backend.', estimatedRam: '150MB', estimatedCpu: 'Medium', deployTime: '~40s', repo: 'https://github.com/payloadcms/payload.git', startScript: 'npm run start' },
    { id: 'supabase', name: 'Supabase Client', category: 'Utility', description: 'The open source Firebase alternative.', estimatedRam: '300MB', estimatedCpu: 'High', deployTime: '~60s', repo: 'https://github.com/supabase/supabase.git', startScript: 'npm run start' },
    { id: 'whatsapp-bot', name: 'WhatsApp Bot', category: 'Bots', description: 'WhatsApp Web bot using Baileys.', estimatedRam: '80MB', estimatedCpu: 'Low', deployTime: '~20s', repo: 'https://github.com/WhiskeySockets/Baileys.git', startScript: 'npm start' },
    { id: 'telegram-bot', name: 'Telegram Bot', category: 'Bots', description: 'Telegraf bot starter.', estimatedRam: '50MB', estimatedCpu: 'Very Low', deployTime: '~15s', repo: 'https://github.com/telegraf/telegraf.git', startScript: 'npm start' },
    { id: 'discord-bot', name: 'Discord Bot', category: 'Bots', description: 'Discord.js bot starter.', estimatedRam: '60MB', estimatedCpu: 'Very Low', deployTime: '~15s', repo: 'https://github.com/discordjs/discord.js.git', startScript: 'npm start' },
    { id: 'minecraft', name: 'Minecraft Server', category: 'Games', description: 'PaperMC Server natively on STB.', estimatedRam: '1024MB', estimatedCpu: 'High', deployTime: '~120s', repo: 'https://github.com/PaperMC/Paper.git', startScript: 'java -Xms1G -Xmx1G -jar server.jar nogui' }
];

export class TemplateService {
    static getTemplates() {
        return MARKETPLACE_TEMPLATES;
    }

    /**
     * Executes the 1-click deployment orchestrator for a template
     */
    static async deployTemplate(templateId, domain, appName) {
        const template = MARKETPLACE_TEMPLATES.find(t => t.id === templateId);
        if (!template) throw new Error('Template not found');

        const appsDir = process.env.APPS_DIR || path.join(process.env.HOME || '/root', 'pixelpanel_apps');
        const appPath = path.join(appsDir, appName);
        
        try {
            EventBus.publish('marketplace.deploy.progress', { appName, status: 'Cloning Repository...', progress: 10 });
            
            // 1. Clone
            await GitService.clone(template.repo, appPath);

            EventBus.publish('marketplace.deploy.progress', { appName, status: 'Generating Environment...', progress: 40 });
            
            // 2. Generate .env
            if (template.env) {
                let envContent = '';
                for (const [key, value] of Object.entries(template.env)) {
                    envContent += `${key}=${value}\n`;
                }
                fs.writeFileSync(path.join(appPath, '.env'), envContent);
            }

            EventBus.publish('marketplace.deploy.progress', { appName, status: 'Starting with PM2...', progress: 70 });
            
            // 3. Register with DB & Start
            const stmt = db.prepare(`
                INSERT INTO apps (name, pm2_name, path, git_repo, branch, start_script) 
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(appName, appName, appPath, template.repo, 'main', template.startScript);
            const appId = result.lastInsertRowid;

            await PM2Service.start(appName);

            EventBus.publish('marketplace.deploy.progress', { appName, status: 'Configuring Proxy & SSL...', progress: 90 });
            
            // 4. Reverse Proxy & Automated SSL (Certbot)
            // We pass domain to the updated NginxService that supports SSL
            await NginxService.generateConfig(appName, domain, 3000, { id: appId }, false, true);

            EventBus.publish('marketplace.deploy.success', { appName, domain, id: appId });
            return { success: true, id: appId };

        } catch (error) {
            EventBus.publish('marketplace.deploy.failed', { appName, error: error.message });
            throw error;
        }
    }
}
