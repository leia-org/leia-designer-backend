import Persona from './models/Persona.js';

class PersonaRepository {
  // READ METHODS

  async findAll() {
    return await Persona.find();
  }

  async findById(id) {
    return await Persona.findById(id);
  }

  async existsByName(name) {
    return !!(await Persona.exists({ name }));
  }

  async findByName(name) {
    return await Persona.find({ name });
  }

  async findLatestVersionByName(name) {
    return await Persona.findOne({ name }).sort({ createdAt: -1 });
  }

  async findByNameAndVersion(name, version) {
    return await Persona.findOne({ name, version });
  }

  // WRITE METHODS

  async create(personaData) {
    const persona = new Persona(personaData);
    return await persona.save();
  }
}

export default new PersonaRepository();
