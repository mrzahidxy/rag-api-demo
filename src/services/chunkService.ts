function chunkText(content: string, maxChunkLength = 500): string[] {
  const cleanedContent = String(content || "").trim();

  if (!cleanedContent) {
    return [];
  }

  const paragraphs = cleanedContent
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    // If a single paragraph is too long, split it into fixed-size pieces.
    if (paragraph.length > maxChunkLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      for (let index = 0; index < paragraph.length; index += maxChunkLength) {
        chunks.push(paragraph.slice(index, index + maxChunkLength).trim());
      }

      continue;
    }

    // Keep combining paragraphs until we reach the chunk size limit.
    const nextChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;

    if (nextChunk.length <= maxChunkLength) {
      currentChunk = nextChunk;
    } else {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  if (chunks.length === 0) {
    // Fallback for plain text that does not contain paragraph breaks.
    for (let index = 0; index < cleanedContent.length; index += maxChunkLength) {
      chunks.push(cleanedContent.slice(index, index + maxChunkLength).trim());
    }
  }

  return chunks.filter(Boolean);
}

export { chunkText };
