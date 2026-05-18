import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(request: Request) {
  const { messages, ordersContext } = await request.json();

  const systemPrompt = `You are a helpful production dashboard assistant for a construction company.
You have access to the current list of supply orders visible in the dashboard.

Current orders:
${ordersContext}

IMPORTANT — whenever you reference a specific order, format its label as a clickable link using this exact markdown syntax:
[Order 3](highlight:the-order-ui-id)

For example: [Order 3](highlight:3-clearwater-plumbing-pvc-piping-4-inch-schedule-40-2026-06-10) from Clearwater Plumbing is delayed.

Use only order IDs that appear in Current orders. This renders as an interactive chip the user can click to jump to that row in the table.

Answer questions concisely and accurately based on the order data above.
If asked about something not in the list, say so clearly.
Format numbers with commas. Keep responses short, field-ready, and action-oriented.`;

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });

  // Return a streaming SSE response
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const data = JSON.stringify({ text: event.delta.text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
