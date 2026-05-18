import type { OrderInsight, OrderWithUiId } from '@/app/types/orders';

export const runtime = 'nodejs';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5.4-mini';
const MAX_ORDERS = 80;
const MAX_INSIGHTS = 12;

interface InsightsResponse {
  insights: OrderInsight[];
}

export async function POST(request: Request) {
  let orders: OrderWithUiId[] = [];

  try {
    const body = await request.json();
    orders = Array.isArray(body.orders)
      ? body.orders.filter(isOrderWithUiId).slice(0, MAX_ORDERS)
      : [];
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
      instructions: `You scan a construction supply order table and produce proactive, actionable dashboard insights.
Today's date is ${today}.

Prioritize:
- Orders due soon or overdue but still "Pending Confirmation".
- Delayed orders with near-term due dates.
- Large quantities that may create site, storage, or crew coordination risk.
- The next delivery that needs crew, unloading, or laydown preparation.
- Orders that are not delayed yet but might become delayed or create field issues.

Rules:
- Return only insights that are useful without the user asking.
- Keep summaries specific and grounded in the supplied orders.
- Return all useful insights, up to ${MAX_INSIGHTS}.
- Include a concrete next action for each insight.
- Use type "actionable" for issues that already require follow-up, such as delayed, overdue, or pending orders near their due date.
- Use type "at_risk" for orders that are not broken yet but might become delayed or might create handling, storage, coordination, confirmation, or crew-readiness issues.
- Do not use type "at_risk" for orders already marked "Delayed"; those are actionable.
- Every order-specific insight must include targetOrderIds using only the supplied order uiId values.
- If an insight is general and cannot map to a row, return an empty targetOrderIds array.`,
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
                maxItems: MAX_INSIGHTS,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: [
                    'id',
                    'title',
                    'summary',
                    'action',
                    'severity',
                    'type',
                    'targetOrderIds',
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
                    type: {
                      type: 'string',
                      enum: ['actionable', 'at_risk'],
                      description:
                        'Use at_risk for orders that might become delayed or might have issues; use actionable for current issues.',
                    },
                    targetOrderIds: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: orders.map((order) => order.uiId),
                      },
                      description:
                        'Visible order uiId values that this insight references. Empty for general insights.',
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
        ? parsed.insights.filter(isOrderInsight).slice(0, MAX_INSIGHTS)
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
    Array.isArray(insight.targetOrderIds) &&
    (insight.type === 'actionable' || insight.type === 'at_risk') &&
    (insight.severity === 'info' ||
      insight.severity === 'warning' ||
      insight.severity === 'critical')
  );
}

function isOrderWithUiId(value: unknown): value is OrderWithUiId {
  if (!value || typeof value !== 'object') return false;

  const order = value as Partial<OrderWithUiId>;
  return (
    typeof order.uiId === 'string' &&
    typeof order.displayIndex === 'number' &&
    typeof order.supplier === 'string' &&
    typeof order.item_description === 'string' &&
    typeof order.quantity === 'number' &&
    typeof order.unit === 'string' &&
    typeof order.expected_delivery_date === 'string' &&
    (order.status === 'On Track' ||
      order.status === 'Pending Confirmation' ||
      order.status === 'Delayed')
  );
}
