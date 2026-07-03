import autocannon from 'autocannon';

// Run Extreme Performance Benchmark
async function runBenchmark() {
    console.log('[Benchmark] Starting API load test against /api/apps (LRU Cached)...');
    
    // Note: In a real scenario we'd pass an auth token, but since this is 
    // internal testing, we'll assume the cache middleware acts immediately.
    const result = await autocannon({
        url: 'http://localhost:3000/api/apps',
        connections: 100, // Simulate 100 concurrent dashboard users
        pipelining: 10,
        duration: 10 // Run for 10 seconds
    });

    console.log('\n--- Benchmark Results ---');
    console.log(`Total Requests: ${result.requests.total}`);
    console.log(`Average Latency: ${result.latency.average} ms`);
    console.log(`p99 Latency: ${result.latency.p99} ms`);
    console.log(`Requests/Sec: ${result.requests.average}`);
    console.log('-------------------------\n');

    if (result.latency.average < 20) {
        console.log('✅ EXTREME PERFORMANCE TARGET MET: Average Latency < 20ms');
    } else {
        console.log('❌ TARGET FAILED: Average Latency > 20ms');
    }
}

runBenchmark();
