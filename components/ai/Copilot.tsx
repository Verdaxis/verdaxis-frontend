
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Bot, Globe } from 'lucide-react';
import { chatWithCopilot } from '../../services/ai';
import MarkdownRenderer from '../ui/MarkdownRenderer';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    groundingMetadata?: any;
}

export const Copilot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'model', text: 'Hello. I am the Verdaxis Copilot. How can I assist with your fleet or procurement today?' }
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Prepare history for API
        const history = messages.map(m => ({ role: m.role, text: m.text }));

        try {
            const response = await chatWithCopilot(userMsg.text, history);
            const aiMsg: Message = { 
                id: (Date.now() + 1).toString(), 
                role: 'model', 
                text: response.text || "I couldn't process that request.",
                groundingMetadata: response.groundingMetadata
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err) {
            // Error handled in service, generic fallback here
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floating Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-[80] p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center
                    ${isOpen ? 'bg-slate-800 rotate-90' : 'bg-verdaxis hover:bg-sky-400 hover:scale-110'}
                `}
                title="GM / Market Inquiries"
            >
                {isOpen ? <X size={24} className="text-white" /> : <MessageSquare size={24} className="text-white animate-pulse" />}
            </button>

            {/* Chat Window */}
            <div className={`
                fixed bottom-24 right-6 w-[calc(100vw-3rem)] md:w-96 max-w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-[80] overflow-hidden flex flex-col transition-all duration-300 origin-bottom-right
                ${isOpen ? 'opacity-100 scale-100 h-[500px]' : 'opacity-0 scale-95 h-0 pointer-events-none'}
            `}>
                {/* Header */}
                <div className="bg-slate-800 p-4 flex items-center space-x-3">
                    <div className="w-8 h-8 bg-verdaxis/20 rounded-lg flex items-center justify-center border border-verdaxis/50">
                        <Bot size={20} className="text-verdaxis" />
                    </div>
                    <div>
                        <h3 className="font-['Montserrat'] font-bold text-white text-sm">GM / Market Inquiries</h3>
                        <div className="flex items-center space-x-1.5">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            <span className="text-[10px] text-slate-400 font-medium">Online • Gemini Flash</span>
                        </div>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && (
                                <div className="w-6 h-6 rounded-full bg-verdaxis/10 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                                    <Bot size={14} className="text-verdaxis" />
                                </div>
                            )}
                            <div className={`
                                max-w-[80%] rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed shadow-sm
                                ${msg.role === 'user' 
                                    ? 'bg-slate-800 text-white rounded-br-none' 
                                    : 'bg-white text-slate-600 border border-slate-200 rounded-bl-none'}
                            `}>
                                {msg.role === 'model' ? <MarkdownRenderer content={msg.text} /> : msg.text}
                                
                                {/* Grounding Sources */}
                                {msg.groundingMetadata?.groundingChunks?.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-slate-200/50">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                                            <Globe size={10} /> Sources
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {msg.groundingMetadata.groundingChunks.map((chunk: any, idx: number) => (
                                                chunk.web ? (
                                                    <a 
                                                        key={idx}
                                                        href={chunk.web.uri}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-white border border-slate-200 text-slate-500 hover:text-verdaxis hover:border-verdaxis text-[10px] px-2 py-1 rounded flex items-center space-x-1 transition-all max-w-[200px]"
                                                    >
                                                        <span className="truncate">{chunk.web.title || 'Web Source'}</span>
                                                    </a>
                                                ) : null
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start animate-pulse">
                             <div className="w-6 h-6 rounded-full bg-verdaxis/10 flex items-center justify-center mr-2 mt-1">
                                    <Bot size={14} className="text-verdaxis" />
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white border-t border-slate-200">
                    <form onSubmit={handleSubmit} className="relative flex items-center">
                        <input 
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about prices, compliance..."
                            className="w-full bg-slate-100 border-none rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-verdaxis focus:outline-none placeholder-slate-400 font-medium text-slate-700"
                        />
                        <button 
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="absolute right-2 p-2 bg-verdaxis text-white rounded-lg hover:bg-sky-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
};
