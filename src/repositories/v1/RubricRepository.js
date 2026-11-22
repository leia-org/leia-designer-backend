import Rubric from '../../models/Rubric.js';
import { applyVisibilityFilters } from '../../utils/entity.js';

class RubricRepository {
  async findById(id) {
    return await Rubric.findById(id);
  }

  async findByQuery(text, userId = null, visibility = 'all', privileged = false) {
    const query = {};

    if (!applyVisibilityFilters(query, userId, visibility, privileged)) {
      return [];
    }

    if (text) {
      query['$text'] = { $search: text };
    }

    return await Rubric.find(query).sort({ updatedAt: -1 });
  }

  async create(rubricData) {
    const rubric = new Rubric(rubricData);
    return await rubric.save();
  }

  async updateById(id, rubricData) {
    return await Rubric.findByIdAndUpdate(
      id,
      { $set: rubricData },
      { new: true, runValidators: true },
    );
  }

  async deleteById(id) {
    return await Rubric.findByIdAndDelete(id);
  }
}

export default new RubricRepository();
