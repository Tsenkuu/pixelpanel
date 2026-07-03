import { EventEmitter } from 'events';

class EventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50); // High limit for plugins
    }

    /**
     * Standardized event publisher
     */
    publish(event, payload) {
        // Emit locally for plugins
        this.emit(event, payload);
        
        // In a scaled architecture, this could also push to Redis/RabbitMQ.
        // For our low-RAM STB target, native EventEmitter is perfect.
        console.log(`[EventBus] Published: ${event}`);
    }

    /**
     * Plugin registration hook
     */
    subscribe(event, callback) {
        this.on(event, callback);
    }
}

export default new EventBus();
