import axios from 'axios';
class ProviderService {

    async verifyApiKeyIntegrity(provider, keyValue) {
        switch (provider) {
        case 'openai':
            return await this.verifyOpenAIApiKey(keyValue);
        case 'gemini':
            return await this.verifyGeminiApiKey(keyValue);
        default:
            return false;
        }
    }
    async verifyOpenAIApiKey(keyValue) {
        try {
            await axios.get('https://api.openai.com/v1/models', {
                headers: {
                    Authorization: 'Bearer ' + keyValue
                }
            });
            return true;
        } catch (error) {
            if (error.response && error.response.status === 401) {
                throw new Error('Invalid API Key for OpenAI.');
            }
            throw new Error('OpenAI service is not available. Please try again later.');
        }
    }

    async verifyGeminiApiKey(keyValue) {
        try {
            await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyValue}`);
            return true;
        } catch (error) {
            if (error.response && error.response.status === 400) {
                throw new Error('Invalid API Key for Gemini.');
            }
            throw new Error('Gemini service is not available. Please try again later.');
        }
    }
}
export default new ProviderService();