/**
 * Web Worker for parsing and formatting huge streams of logs
 * This prevents the main UI thread from stuttering when tailing thousands of lines.
 */

self.onmessage = function (e) {
  const { type, payload } = e.data;

  if (type === 'PARSE_CHUNK') {
    // In a real scenario, this worker would parse ANSI codes, detect URLs,
    // match error signatures, and buffer lines to emit in batches to xterm.js
    // to preserve 60FPS on the main thread.
    
    let processedText = payload;
    
    // Simulate some heavy regex processing (e.g. searching for error traces)
    const errorRegex = /error|exception/i;
    if (errorRegex.test(payload)) {
      // Highlight errors in red ANSI
      processedText = `\x1b[31m${payload}\x1b[0m`;
    }

    // Send the processed chunk back to the main thread
    self.postMessage({
      type: 'CHUNK_READY',
      payload: processedText
    });
  }
};
