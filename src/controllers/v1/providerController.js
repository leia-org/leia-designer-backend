import ProviderService from '../../services/v1/ProviderService.js';

export const getAllModelsAndDetails = async (req, res, next) => {
  try {
    const models = await ProviderService.getAllModelsAndDetails();
    res.json(models);
  } catch (err) {
    next(err);
  }
};
