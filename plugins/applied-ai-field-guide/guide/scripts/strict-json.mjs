// Parse once with the native JSON grammar, then reject repeated decoded keys.
// The scan only traverses syntactically valid JSON and treats each object separately.
export function parseStrictJson(body) {
  const document = JSON.parse(body);
  const duplicate = duplicateJsonKey(body);
  if (duplicate) throw new SyntaxError(`duplicate object key ${JSON.stringify(duplicate.key)}`);
  return document;
}

function duplicateJsonKey(body) {
  let cursor = 0;
  const whitespace = /\s/;

  function skipWhitespace() {
    while (cursor < body.length && whitespace.test(body[cursor])) cursor += 1;
  }

  function parseString() {
    const start = cursor;
    cursor += 1;
    while (cursor < body.length) {
      if (body[cursor] === "\\") {
        cursor += 2;
      } else if (body[cursor] === "\"") {
        cursor += 1;
        return JSON.parse(body.slice(start, cursor));
      } else {
        cursor += 1;
      }
    }
    return "";
  }

  function parseValue() {
    skipWhitespace();
    if (body[cursor] === "{") return parseObject();
    if (body[cursor] === "[") return parseArray();
    if (body[cursor] === "\"") {
      parseString();
      return null;
    }
    while (cursor < body.length && !/[\s,}\]]/.test(body[cursor])) cursor += 1;
    return null;
  }

  function parseArray() {
    cursor += 1;
    skipWhitespace();
    while (cursor < body.length && body[cursor] !== "]") {
      const duplicate = parseValue();
      if (duplicate) return duplicate;
      skipWhitespace();
      if (body[cursor] === ",") {
        cursor += 1;
        skipWhitespace();
      }
    }
    cursor += 1;
    return null;
  }

  function parseObject() {
    cursor += 1;
    skipWhitespace();
    const keys = new Set();
    while (cursor < body.length && body[cursor] !== "}") {
      const key = parseString();
      if (keys.has(key)) return { key };
      keys.add(key);
      skipWhitespace();
      cursor += 1;
      const duplicate = parseValue();
      if (duplicate) return duplicate;
      skipWhitespace();
      if (body[cursor] === ",") {
        cursor += 1;
        skipWhitespace();
      }
    }
    cursor += 1;
    return null;
  }

  return parseValue();
}
