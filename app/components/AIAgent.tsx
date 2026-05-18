'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Order } from '@/app/types/orders';
import { formatOrdersForAI } from '@/app/lib/orders';
import { IoSparklesOutline } from "react-icons/io5";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAgentProps {
  orders: Order[];
}

const SUGGESTED_PROMPTS = [
  'Which orders are delayed?',
  'Summarize the current delivery status.',
  'Which supplier has the most items?',
  "What's arriving soonest?",
];

export default function AIAgent({ orders }: AIAgentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamedTextRef = useRef('');

  // Scroll to bottom whenever messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          ordersContext: formatOrdersForAI(orders),
        }),
      });

      if (!res.ok || !res.body) throw new Error('Failed to get response');

      // Stream the response text
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      streamedTextRef.current = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE lines: "data: <json>\n\n"
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6);
            if (payload === '[DONE]') break;
            try {
              const { text } = JSON.parse(payload);
              if (text) {
                streamedTextRef.current += text;
                setMessages((prev) => {
                  const copy = [...prev];
                  copy[copy.length - 1] = {
                    role: 'assistant',
                    content: streamedTextRef.current,
                  };
                  return copy;
                });
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
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
    <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
          <IoSparklesOutline />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-800">AI Assistant</p>
          <p className="text-xs text-zinc-400">Aware of {orders.length} visible order{orders.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3 pt-2">
            <p className="text-xs text-zinc-400 text-center">Ask me anything about the orders above.</p>
            <div className="grid grid-cols-1 gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-xs text-zinc-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm whitespace-pre-wrap'
                    : 'bg-zinc-100 text-zinc-800 rounded-bl-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  msg.content
                ) : msg.content ? (
                  <ReactMarkdown
                    components={{
                      // Headings
                      h1: ({ children }) => <p className="font-semibold text-base mb-1">{children}</p>,
                      h2: ({ children }) => <p className="font-semibold mb-1">{children}</p>,
                      h3: ({ children }) => <p className="font-medium mb-0.5">{children}</p>,
                      // Paragraphs
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      // Bold / italic
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      // Lists
                      ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-0.5 last:mb-0">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5 last:mb-0">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                      // Code
                      code: ({ children }) => (
                        <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono text-xs text-zinc-700">{children}</code>
                      ),
                      pre: ({ children }) => (
                        <pre className="mb-2 overflow-x-auto rounded-lg bg-zinc-200 p-2 font-mono text-xs text-zinc-700 last:mb-0">{children}</pre>
                      ),
                      // Tables
                      table: ({ children }) => (
                        <div className="mb-2 overflow-x-auto last:mb-0">
                          <table className="min-w-full border-collapse text-xs">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="border-b border-zinc-300">{children}</thead>,
                      tbody: ({ children }) => <tbody className="divide-y divide-zinc-200">{children}</tbody>,
                      th: ({ children }) => (
                        <th className="py-1 pr-3 text-left font-semibold text-zinc-600 first:pl-0">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="py-1 pr-3 text-zinc-700 first:pl-0">{children}</td>
                      ),
                      // Horizontal rule
                      hr: () => <hr className="my-2 border-zinc-300" />,
                      // Blockquote
                      blockquote: ({ children }) => (
                        <blockquote className="mb-2 border-l-2 border-zinc-400 pl-3 text-zinc-600 italic last:mb-0">{children}</blockquote>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
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
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-zinc-300">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
