import type { Order, OrderInsight } from '@/app/types/orders';

export const runtime = 'nodejs';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5.4-mini';
const MAX_ORDERS = 80;

interface InsightsResponse {
  insights: OrderInsight[];
}

export async function POST(request: Request) {
  let orders: Order[] = [];

  try {
    const body = await request.json();
    orders = Array.isArray(body.orders) ? body.orders.slice(0, MAX_ORDERS) : [];
  } catch {
    return Response.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  if (orders.length === 0) {
    return Response.json({ insights: [] satisfies OrderInsight[] });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: 'OPENAI_API_KEY is not configured.' },
      { status: 500 },
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const res = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_INSIGHTS_MODEL ?? DEFAULT_MODEL,
      instructions: `You scan a construction supply order table and produce proactive, actionable dashboard pop-up insights.
Today's date is ${today}.

Prioritize:
- Orders due soon or overdue but still "Pending Confirmation".
- Delayed orders with near-term due dates.
- Large quantities that may create site, storage, or crew coordination risk.
- Supplier concentration or repeated risk patterns.

Rules:
- Return only insights that are useful without the user asking.
- Keep summaries specific and grounded in the supplied orders.
- Use no more than 4 insights.
- Include a concrete next action for each insight.`,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify({ today, orders }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'order_insights',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['insights'],
            properties: {
              insights: {
                type: 'array',
                maxItems: 4,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: [
                    'id',
                    'title',
                    'summary',
                    'action',
                    'severity',
                    'supplier',
                    'dueDate',
                  ],
                  properties: {
                    id: {
                      type: 'string',
                      description: 'Stable kebab-case identifier for this insight.',
                    },
                    title: { type: 'string', maxLength: 70 },
                    summary: { type: 'string', maxLength: 180 },
                    action: { type: 'string', maxLength: 140 },
                    severity: {
                      type: 'string',
                      enum: ['info', 'warning', 'critical'],
                    },
                    supplier: {
                      type: ['string', 'null'],
                      description: 'Primary supplier involved, or null if cross-supplier.',
                    },
                    dueDate: {
                      type: ['string', 'null'],
                      description: 'Relevant YYYY-MM-DD due date, or null.',
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return Response.json(
      { error: 'OpenAI insight generation failed.', detail },
      { status: 502 },
    );
  }

  const data = await res.json();
  const parsed = parseInsights(data);

  return Response.json(parsed);
}

function parseInsights(response: unknown): InsightsResponse {
  const text = extractResponseText(response);
  if (!text) return { insights: [] };

  try {
    const parsed = JSON.parse(text) as InsightsResponse;
    return {
      insights: Array.isArray(parsed.insights)
        ? parsed.insights.filter(isOrderInsight).slice(0, 4)
        : [],
    };
  } catch {
    return { insights: [] };
  }
}

function extractResponseText(response: unknown): string {
  if (!response || typeof response !== 'object') return '';

  const maybeText = (response as { output_text?: unknown }).output_text;
  if (typeof maybeText === 'string') return maybeText;

  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) return '';

  return output
    .flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const content = (item as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    })
    .map((part) => {
      if (!part || typeof part !== 'object') return '';
      const text = (part as { text?: unknown }).text;
      return typeof text === 'string' ? text : '';
    })
    .join('');
}

function isOrderInsight(value: unknown): value is OrderInsight {
  if (!value || typeof value !== 'object') return false;

  const insight = value as Partial<OrderInsight>;
  return (
    typeof insight.id === 'string' &&
    typeof insight.title === 'string' &&
    typeof insight.summary === 'string' &&
    typeof insight.action === 'string' &&
    (insight.severity === 'info' ||
      insight.severity === 'warning' ||
      insight.severity === 'critical')
  );
}
