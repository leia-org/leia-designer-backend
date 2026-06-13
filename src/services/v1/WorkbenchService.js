import axios from 'axios';
class WorkbenchService {
    async replicationNameExists(name, authorizationHeader) {
        const workbenchBackendUrl = process.env.WORKBENCH_BACKEND_URL;

        if (!workbenchBackendUrl) {
            const error = new Error('Workbench backend configuration is missing');
            error.statusCode = 500;
            throw error;
        }
            const response = await axios.get(
                `${workbenchBackendUrl.replace(/\/$/, '')}/api/v1/replications/exists/${encodeURIComponent(name)}`,
                {
                    headers: {
                        Authorization: authorizationHeader,
                    },
                }
            );

            return response.data.exists;
    
    }
    async createReplication(experiment, name, authorizationHeader) {
        const workbenchBackendUrl = process.env.WORKBENCH_BACKEND_URL;

        if (!workbenchBackendUrl) {
            const error = new Error('Workbench backend configuration is missing');
            error.statusCode = 500;
            throw error;
        }

        const response = await axios.post(
            `${workbenchBackendUrl.replace(/\/$/, '')}/api/v1/replications`,
            { experiment, name },
            {
                headers: {
                    Authorization: authorizationHeader,
                },
            }
        );

        return response.data;
    }
}
export default new WorkbenchService();