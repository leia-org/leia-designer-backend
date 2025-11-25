import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import Problem from '../src/models/Problem.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const sync = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const problems = await Problem.find({});
        console.log(`Found ${problems.length} problems.`);

        const runnerUrl = process.env.RUNNER_URL || 'http://localhost:5002';

        for (const problem of problems) {
            try {
                console.log(`Indexing ${problem.metadata.name}...`);
                await axios.post(`${runnerUrl}/api/v1/agent/index`, problem, {
                    headers: {
                        'Authorization': `Bearer ${process.env.RUNNER_KEY}`
                    }
                });
                console.log(`Indexed ${problem.metadata.name}`);
            } catch (err) {
                console.error(`Failed to index ${problem.metadata.name}:`, err.message);
                if (err.response) {
                    console.error('Response data:', err.response.data);
                }
            }
        }

        console.log('Sync complete.');
        process.exit(0);
    } catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
};

sync();
