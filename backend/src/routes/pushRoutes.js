import express from 'express';
import { PushNotificationService } from '../services/pushNotificationService.js';

const router = express.Router();

router.get('/vapidPublicKey', (req, res) => {
    res.json({ publicKey: PushNotificationService.vapidKeys.publicKey });
});

router.post('/subscribe', (req, res) => {
    try {
        const subscription = req.body;
        PushNotificationService.subscribe(subscription);
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/unsubscribe', (req, res) => {
    try {
        const { endpoint } = req.body;
        PushNotificationService.unsubscribe(endpoint);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
