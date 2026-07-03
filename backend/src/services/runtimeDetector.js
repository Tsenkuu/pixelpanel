import fs from 'fs';
import path from 'path';

export class RuntimeDetector {
    /**
     * Analyzes a workspace and returns the detected runtime, build command, and start script.
     * @param {string} workspacePath - Absolute path to the cloned repository
     */
    static detect(workspacePath) {
        console.log(`[RuntimeDetector] Analyzing ${workspacePath}...`);
        
        // 1. Node.js Detection
        if (fs.existsSync(path.join(workspacePath, 'package.json'))) {
            const pkg = JSON.parse(fs.readFileSync(path.join(workspacePath, 'package.json'), 'utf8'));
            let startScript = 'npm start';
            let buildCommand = null;

            // Detect Next.js / Nuxt.js / React (build required)
            if (pkg.scripts && pkg.scripts.build) {
                buildCommand = 'npm install && npm run build';
            } else {
                buildCommand = 'npm install --production';
            }

            // Fallback for missing npm start but exists server.js/index.js
            if (!pkg.scripts?.start) {
                if (fs.existsSync(path.join(workspacePath, 'server.js'))) startScript = 'node server.js';
                else if (fs.existsSync(path.join(workspacePath, 'index.js'))) startScript = 'node index.js';
            }

            return {
                runtime: 'node',
                buildCommand,
                startScript
            };
        }

        // 2. Python Detection
        if (fs.existsSync(path.join(workspacePath, 'requirements.txt'))) {
            let startScript = 'python app.py'; // fallback
            
            // Try to find the entrypoint
            if (fs.existsSync(path.join(workspacePath, 'manage.py'))) {
                // Django
                startScript = 'python manage.py runserver 0.0.0.0:$PORT';
            } else if (fs.existsSync(path.join(workspacePath, 'main.py'))) {
                startScript = 'python main.py';
            }

            return {
                runtime: 'python',
                buildCommand: 'pip install -r requirements.txt',
                startScript
            };
        }

        // 3. PHP Detection
        if (fs.existsSync(path.join(workspacePath, 'composer.json')) || fs.existsSync(path.join(workspacePath, 'index.php'))) {
            let buildCommand = null;
            if (fs.existsSync(path.join(workspacePath, 'composer.json'))) {
                buildCommand = 'composer install --no-dev';
            }

            return {
                runtime: 'php',
                buildCommand,
                startScript: 'php -S 0.0.0.0:$PORT'
            };
        }

        // 4. Go Detection
        if (fs.existsSync(path.join(workspacePath, 'go.mod'))) {
            return {
                runtime: 'go',
                buildCommand: 'go build -o pixel_app_bin',
                startScript: './pixel_app_bin'
            };
        }

        // 5. Rust Detection
        if (fs.existsSync(path.join(workspacePath, 'Cargo.toml'))) {
            return {
                runtime: 'rust',
                buildCommand: 'cargo build --release',
                startScript: './target/release/app_name' // Need to extract from Cargo.toml but this is a generic fallback
            };
        }

        // 6. Java Detection
        if (fs.existsSync(path.join(workspacePath, 'pom.xml'))) {
            return {
                runtime: 'java',
                buildCommand: 'mvn package',
                startScript: 'java -jar target/*.jar' // Assuming one fat jar
            };
        }

        // 7. Fallback (Static HTML)
        return {
            runtime: 'static',
            buildCommand: null,
            startScript: 'npx serve -s . -p $PORT'
        };
    }
}
