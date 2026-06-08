import Label from '../../models/Label.js';

class LabelRepository {
    // READ METHODS

    async find(query = {}) {
        return await Label.find(query);
    }

    async findAll() {
        return await Label.find();
    }

    async findById(id) {
        return await Label.findById(id);
    }

    async findByName(name) {
        return await Label.findOne({ name });
    }

    // CREATE/UPDATE METHODS

    async create(labelData) {
        const label = new Label(labelData);
        return await label.save();
    }

    async update(id, labelData) {
        return await Label.findByIdAndUpdate(id, labelData, { new: true });
    }

    async delete(id) {
        return await Label.findByIdAndDelete(id);
    }
}               
export default new LabelRepository();