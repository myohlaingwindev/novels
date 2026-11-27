export function creditText(originAuthor: string, penName: string): { writtenBy: string; publishedBy: string } {
  return {
    writtenBy: `Written by: ${originAuthor.trim()}`,
    publishedBy: `Published by: ${penName}`,
  };
}
