import pm2 from 'pm2';

export class PM2Service {
    static connect() {
        return new Promise((resolve, reject) => {
            pm2.connect((err) => {
                if (err) {
                    console.error('[PM2] Connection Error:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    static async start(options) {
        await this.connect();
        return new Promise((resolve, reject) => {
            pm2.start(options, (err, apps) => {
                pm2.disconnect();
                if (err) reject(err);
                else resolve(apps);
            });
        });
    }

    static async stop(processName) {
        await this.connect();
        return new Promise((resolve, reject) => {
            pm2.stop(processName, (err, proc) => {
                pm2.disconnect();
                if (err) reject(err);
                else resolve(proc);
            });
        });
    }

    static async restart(processName) {
        await this.connect();
        return new Promise((resolve, reject) => {
            pm2.restart(processName, (err, proc) => {
                pm2.disconnect();
                if (err) reject(err);
                else resolve(proc);
            });
        });
    }

    static async reload(processName) {
        await this.connect();
        return new Promise((resolve, reject) => {
            pm2.reload(processName, (err, proc) => {
                pm2.disconnect();
                if (err) reject(err);
                else resolve(proc);
            });
        });
    }

    static async delete(processName) {
        await this.connect();
        return new Promise((resolve, reject) => {
            pm2.delete(processName, (err, proc) => {
                pm2.disconnect();
                if (err) reject(err);
                else resolve(proc);
            });
        });
    }

    static async list() {
        await this.connect();
        return new Promise((resolve, reject) => {
            pm2.list((err, list) => {
                pm2.disconnect();
                if (err) reject(err);
                else resolve(list);
            });
        });
    }

    static async describe(processName) {
        await this.connect();
        return new Promise((resolve, reject) => {
            pm2.describe(processName, (err, proc) => {
                pm2.disconnect();
                if (err) reject(err);
                else resolve(proc);
            });
        });
    }

    static async save() {
        await this.connect();
        return new Promise((resolve, reject) => {
            pm2.dump((err, result) => {
                pm2.disconnect();
                if (err) reject(err);
                else resolve(result);
            });
        });
    }
}
