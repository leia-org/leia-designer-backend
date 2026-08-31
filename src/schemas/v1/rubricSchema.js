const nonEmptyText = { type: 'string', minLength: 1 };

export const rubricSpecSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['sections'],
  properties: {
    sections: {
      type: 'array', minItems: 1,
      items: {
        type: 'object', additionalProperties: false,
        required: ['title', 'weight', 'levels', 'criteria'],
        properties: {
          title: { ...nonEmptyText, maxLength: 500 },
          weight: { type: 'number', exclusiveMinimum: 0, maximum: 100 },
          levels: { type: 'array', minItems: 1, uniqueItems: true, items: { ...nonEmptyText, maxLength: 500 } },
          criteria: {
            type: 'array', minItems: 1,
            items: {
              type: 'object', additionalProperties: false, required: ['name', 'descriptors'],
              properties: {
                name: { ...nonEmptyText, maxLength: 1000 },
                descriptors: {
                  type: 'array', minItems: 1,
                  items: {
                    type: 'object', additionalProperties: false, required: ['level', 'description'],
                    properties: {
                      level: { ...nonEmptyText, maxLength: 500 },
                      description: { ...nonEmptyText, maxLength: 10000 },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const rubricDefinitionSchema = {
  $id: 'https://leia.dev/schemas/v1/rubric.json',
  type: 'object', additionalProperties: false, required: ['apiVersion', 'metadata', 'spec'],
  properties: {
    apiVersion: { type: 'string', const: 'v1' },
    metadata: {
      type: 'object', additionalProperties: false, required: ['name'],
      properties: { name: { type: 'string', minLength: 1, maxLength: 120 } },
    },
    spec: rubricSpecSchema,
  },
};

export default rubricDefinitionSchema;
