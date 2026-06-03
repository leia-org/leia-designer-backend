import axios from 'axios';

export const createReplication = async (req, res, next) => {
  try {
    const workbenchBackendUrl = process.env.WORKBENCH_BACKEND_URL;

    if (!workbenchBackendUrl ) {
      const error = new Error('Workbench backend configuration is missing');
      error.statusCode = 500;
      throw error;
    }

    const response = await axios.post(
      `${workbenchBackendUrl.replace(/\/$/, '')}/api/v1/replications`,
      req.body,
      {
        headers: {
          Authorization: `${req.headers.authorization}`,
        },
      }
    );

    res.status(response.status || 201).json(response.data);
  } catch (error) {
    next(error);
  }
};
export const replicationNameExists = async (req, res, next) => {
  try {
    const workbenchBackendUrl = process.env.WORKBENCH_BACKEND_URL;

    if (!workbenchBackendUrl ) {
      const error = new Error('Workbench backend configuration is missing');
      error.statusCode = 500;
      throw error;
    }

    const response = await axios.get(
      `${workbenchBackendUrl.replace(/\/$/, '')}/api/v1/replications/exists/${encodeURIComponent(req.params.name)}`,
      {
        headers: {
          Authorization: `${req.headers.authorization}`,
        },
      }
    );

    res.json({ exists: response.data.exists });
  } catch (error) {
    next(error);
  }
};