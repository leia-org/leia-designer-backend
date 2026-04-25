import LabelService from '../../services/v1/LabelService.js';

export const getLabels = async (req, res, next) => {
  try {
    const userId = req.auth?.payload?.id;
    const labels = await LabelService.findAllVisible(userId);
    res.json(labels);
  } catch (err) {
    next(err);
  }
}

export const getLabelById = async (req, res, next) => {
  try {
    const label = await LabelService.findById(req.params.id);
    if (!label) {
      const error = new Error('Label not found');
      error.statusCode = 404;
      throw error;
    }

    res.json(label);
  } catch (err) {
    next(err);
  }
};

export const createLabel = async (req, res, next) => {
  try {
    const labelData = {
      ...req.body,
    };
    const newLabel = await LabelService.create(labelData);
    res.status(201).json(newLabel);
  } catch (err) {
    next(err);
  }
};

export const updateLabel = async (req, res, next) => {
  try {
    const userId = req.auth?.payload?.id;
    const role = req.auth?.payload?.role;
    const label = await LabelService.findById(req.params.id);

    if (!label) {
      const error = new Error('Label not found');
      error.statusCode = 404;
      throw error;
    }

    if (role !== 'admin' && label.user?.toString() !== userId) {
      const error = new Error('Unauthorized: You can only update your own labels');
      error.statusCode = 403;
      throw error;
    }

    const updatedLabel = await LabelService.update(req.params.id, req.body);
    res.json(updatedLabel);
  } catch (err) {
    next(err);
  }
};

export const deleteLabel = async (req, res, next) => {
  try {
    const label = await LabelService.findById(req.params.id);
    if (!label) {
      const error = new Error('Label not found');
      error.statusCode = 404;
      throw error;
    }
    await LabelService.delete(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};