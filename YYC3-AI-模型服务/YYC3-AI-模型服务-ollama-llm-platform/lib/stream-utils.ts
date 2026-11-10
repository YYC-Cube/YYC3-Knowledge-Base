// lib/stream-utils.ts
export const streamToReadable = (stream: ReadableStream) => {
  return new ReadableStream({
    async pull(controller) {
      for await (const chunk of stream) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
};