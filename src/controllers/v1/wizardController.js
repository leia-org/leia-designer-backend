import axios from 'axios';
import RunnerService from '../../services/v1/RunnerService.js';

export const chat = async (req, res, next) => {
    try {
        const { message, context, threadId, problem, originalQuery } = req.body;
        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        const result = await RunnerService.processAgentRequest(message, context, threadId, problem, originalQuery);
        res.json(result);
    } catch (error) {
        console.error('Error in wizard chat:', error);
        next(error);
    }
};
