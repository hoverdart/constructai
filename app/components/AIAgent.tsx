'use client';

import { useEffect, useRef, useState } from 'react';
import { IoSparklesOutline } from 'react-icons/io5';
import type { OrderWithUiId } from '@/app/types/orders';
import { formatOrdersForAI } from '@/app/lib/orders';
import MarkdownContent from './MarkdownContent';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAgentProps {
  orders: OrderWithUiId[];
  isOpen: boolean;
  onHighlight: (orderId: string) => void;
  onOpenChange: (open: boolean) => void;
}

const SUGGESTED_PROMPTS = [
  'What needs attention today?',
  'Which orders should I call on?',
  "What's the next delivery?",
  'What could block the crew?',
];

export default function AIAgent({
  orders,
  isOpen,
  onHighlight,
  onOpenChange,
}: AIAgentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamedTextRef = useRef('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, isOpen]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);
    streamedTextRef.current = '';
    onOpenChange(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          ordersContext: formatOrdersForAI(orders),
        }),
      });

      if (!res.ok || !res.body) throw new Error('Bad response');

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const { text } = JSON.parse(payload);
            if (text) {
              streamedTextRef.current += text;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                  role: 'assistant',
                  content: streamedTextRef.current,
                };
                return next;
              });
            }
          } catch {
            // Skip malformed chunks.
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] transition-all sm:w-96 ${
        isOpen ? 'h-[min(620px,calc(100vh-2rem))]' : 'h-16 sm:w-80'
      }`}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl">
        <button
          type="button"
          onClick={() => onOpenChange(!isOpen)}
          className="flex w-full items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 text-left transition hover:bg-zinc-50"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
              <IoSparklesOutline />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-zinc-800">
                AI Assistant
              </span>
              <span className="block truncate text-xs text-zinc-400">
                {isOpen
                  ? `Aware of ${orders.length} visible order${orders.length !== 1 ? 's' : ''}`
                  : 'Tap for jobsite help'}
              </span>
            </span>
          </span>
          <span className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-500">
            {isOpen ? 'Minimize' : 'Open'}
          </span>
        </button>

        <div className={`${isOpen ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col`}>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <EmptyState onSelect={sendMessage} />
            ) : (
              messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} onHighlight={onHighlight} />
              ))
            )}
            {loading && messages.at(-1)?.role !== 'assistant' && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-zinc-100 p-3">
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your orders..."
                className="flex-1 resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-40"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-zinc-300">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="flex flex-col gap-3 pt-2">
      <p className="text-center text-xs text-zinc-400">
        Ask for a quick jobsite read on the visible orders.
      </p>
      <div className="grid grid-cols-1 gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelect(prompt)}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-xs text-zinc-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onHighlight,
}: {
  message: Message;
  onHighlight: (orderId: string) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? 'whitespace-pre-wrap rounded-br-sm bg-blue-600 text-white'
            : 'rounded-bl-sm bg-zinc-100 text-zinc-800'
        }`}
      >
        {isUser ? (
          message.content
        ) : message.content ? (
          <MarkdownContent content={message.content} onHighlight={onHighlight} />
        ) : (
          <TypingIndicator />
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <span className="inline-flex gap-1">
      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
    </span>
  );
}
