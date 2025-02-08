import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
});

// Relation Types: 0: aggregation, 1: inheritance, 2: composition, 3: association

async function getParser(text) {
  const diagram = await mermaid.mermaidAPI.getDiagramFromText(text);
  const parser = diagram.getParser().yy;
  return parser;
}

async function parseClassDiagram(text) {
  if (!text || !text.includes('classDiagram')) {
    return null;
  }
  const parser = await getParser(text);
  const result = {
    classes: Array.from(parser.getClasses().values()),
    relationships: parser.getRelations(),
  }
  return result;
}

export { parseClassDiagram };