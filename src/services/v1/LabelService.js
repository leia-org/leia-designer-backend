import LabelRepository from '../../repositories/v1/LabelRepository.js';
import LeiaRepository from '../../repositories/v1/LeiaRepository.js';
class LabelService {
    // READ METHODS

    async findAllVisible(userId) {

        return await LabelRepository.find({ $or: [{ isGlobal: true }, { user: userId }] });
    }

    async findById(id) {
        return await LabelRepository.findById(id);
    }

    async findByName(name) {
        return await LabelRepository.findByName(name);
    }

    // CREATE/UPDATE METHODS

    async create(labelData) {
        return await LabelRepository.create(labelData);
    }

    async update(id, labelData) {
        return await LabelRepository.update(id, labelData);
    }

    async delete(id) {
        return await LabelRepository.delete(id);
    }

    async merge(sourceLabelId, targetLabelId) {
        await LeiaRepository.replaceLabels(sourceLabelId, targetLabelId);
        return await LabelRepository.delete(sourceLabelId);
    }
}
    export default new LabelService();