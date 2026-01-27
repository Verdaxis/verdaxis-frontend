import React, { useState } from 'react';
import { 
    ChevronRight, 
    ChevronLeft, 
    Newspaper, 
    Bot, 
    Send, 
    TrendingUp, 
    TrendingDown,
    AlertCircle,
    Loader2,
    Sparkles
} from 'lucide-react';

interface InsightPanelProps {
    context?: {
        region?: string;
        fuelType?: string;
    };
}

// Mock news data
const MOCK_NEWS = [
    {
        id: 1,
        title: 'Green Methanol Prices Surge in ARA',
        summary: 'Spot prices for green methanol reached $545/MT amid tight supply...',
        source: 'Platts',
        time: '2h ago',
        trend: 'up' as const,
    },
    {
        id: 2,
        title: 'FuelEU Maritime Deadline Approaching',
        summary: '2026 compliance deadline drives increased demand for biofuels...',
        source: 'Argus',
        time: '4h ago',
        trend: 'neutral' as const,
    },
    {
        id: 3,
        title: 'Singapore LNG Bunker Sales Hit Record',
        summary: 'Q1 2026 sees 15% increase in LNG bunkering volumes...',
        source: 'Gena',
        time: '6h ago',
        trend: 'up' as const,
    },
    {
        id: 4,
        title: 'Ammonia Supply Concerns in Asia',
        summary: 'Production outages in Middle East impact Asian ammonia availability...',
        source: 'Platts',
        time: '8h ago',
        trend: 'down' as const,
    },
];

// Mock AI suggestions based on context
const getAISuggestion = (context?: { region?: string; fuelType?: string }) => {
    if (context?.region === 'Singapore' && context?.fuelType === 'Methanol') {
        return "I see you're looking at Methanol in Singapore. Green Methanol supply is currently tight with prices trending upward. Would you like me to suggest Ethanol alternatives in the region?";
    }
    if (context?.fuelType === 'LNG') {
        return "LNG bunkering volumes are at record highs. Singapore and Rotterdam have the best availability. Shall I filter for certified suppliers only?";
    }
    return "Welcome to the Verdaxis marketplace! I can help you find the best fuel options for your fleet. Try searching by region or fuel type, and I'll provide tailored recommendations.";
};

export const InsightPanel: React.FC<InsightPanelProps> = ({ context }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'news' | 'ai'>('ai');
    const [userMessage, setUserMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [messages, setMessages] = useState<{role: 'user' | 'ai'; content: string}[]>([
        { role: 'ai', content: getAISuggestion(context) }
    ]);

    const handleSendMessage = async () => {
        if (!userMessage.trim()) return;
        
        const newMessage = userMessage;
        setMessages(prev => [...prev, { role: 'user', content: newMessage }]);
        setUserMessage('');
        setIsTyping(true);
        
        // Simulate AI response
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const responses: Record<string, string> = {
            'ethanol': "Great choice! I found 3 Ethanol listings in Singapore with immediate availability. The best price is from a Tier 1 Producer at $780/MT. Would you like to see these?",
            'price': "Current market prices: Methanol (Green) $520-545/MT, Biofuel $750-800/MT, LNG $880-920/MT. Prices are based on latest Platts assessments.",
            'compliance': "For FuelEU Maritime compliance, Green Methanol and certified Biofuels offer the best GHG reduction factors. I recommend focusing on ISCC-certified suppliers for audit readiness.",
            'default': "I understand you're looking for fuel options. Could you be more specific about the region, fuel type, or quantity you need? I can provide tailored recommendations based on your requirements.",
        };
        
        const lowerMsg = newMessage.toLowerCase();
        let response = responses.default;
        if (lowerMsg.includes('ethanol')) response = responses.ethanol;
        else if (lowerMsg.includes('price')) response = responses.price;
        else if (lowerMsg.includes('compliance') || lowerMsg.includes('fueleu')) response = responses.compliance;
        
        setMessages(prev => [...prev, { role: 'ai', content: response }]);
        setIsTyping(false);
    };

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed top-1/2 -translate-y-1/2 z-40 p-2 bg-slate-800 border border-slate-700 rounded-l-lg shadow-lg transition-all ${
                    isOpen ? 'right-80' : 'right-0'
                }`}
            >
                {isOpen ? <ChevronRight size={20} className="text-slate-400" /> : <ChevronLeft size={20} className="text-slate-400" />}
            </button>

            {/* Panel */}
            <div className={`fixed top-0 right-0 h-full w-80 bg-slate-800/95 backdrop-blur-sm border-l border-slate-700 z-30 transition-transform duration-300 ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>
                {/* Header Tabs */}
                <div className="flex border-b border-slate-700">
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-colors ${
                            activeTab === 'ai'
                                ? 'text-emerald-400 border-b-2 border-emerald-400'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Bot size={16} />
                        AI Assistant
                    </button>
                    <button
                        onClick={() => setActiveTab('news')}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-colors ${
                            activeTab === 'news'
                                ? 'text-emerald-400 border-b-2 border-emerald-400'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Newspaper size={16} />
                        Market News
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-col h-[calc(100%-57px)]">
                    {activeTab === 'news' ? (
                        /* News Feed */
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            <div className="text-xs uppercase font-bold text-slate-500 mb-2">Latest Updates</div>
                            {MOCK_NEWS.map(item => (
                                <div 
                                    key={item.id}
                                    className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 hover:border-slate-600 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h4 className="font-medium text-slate-200 text-sm leading-tight">
                                            {item.title}
                                        </h4>
                                        {item.trend === 'up' && <TrendingUp size={14} className="text-emerald-400 flex-shrink-0" />}
                                        {item.trend === 'down' && <TrendingDown size={14} className="text-red-400 flex-shrink-0" />}
                                    </div>
                                    <p className="text-xs text-slate-400 mb-2 line-clamp-2">{item.summary}</p>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500">{item.source}</span>
                                        <span className="text-slate-600">{item.time}</span>
                                    </div>
                                </div>
                            ))}
                            <div className="text-center py-4">
                                <p className="text-xs text-slate-500">
                                    <AlertCircle size={12} className="inline mr-1" />
                                    Live feed via Platts/Argus API coming soon
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* AI Chat */
                        <>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map((msg, idx) => (
                                    <div 
                                        key={idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] rounded-lg p-3 ${
                                            msg.role === 'user'
                                                ? 'bg-emerald-500/20 text-slate-200'
                                                : 'bg-slate-700/50 text-slate-300'
                                        }`}>
                                            {msg.role === 'ai' && (
                                                <div className="flex items-center gap-1 mb-1 text-emerald-400 text-xs font-bold">
                                                    <Sparkles size={12} />
                                                    Verdaxis AI
                                                </div>
                                            )}
                                            <p className="text-sm">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-slate-700/50 rounded-lg p-3 flex items-center gap-2">
                                            <Loader2 size={14} className="animate-spin text-emerald-400" />
                                            <span className="text-sm text-slate-400">Thinking...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t border-slate-700">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={userMessage}
                                        onChange={(e) => setUserMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Ask a question..."
                                        className="flex-1 px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!userMessage.trim() || isTyping}
                                        className={`p-2 rounded-lg transition-colors ${
                                            userMessage.trim() && !isTyping
                                                ? 'bg-emerald-500 text-slate-900 hover:bg-emerald-400'
                                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                        }`}
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-2 text-center">
                                    Powered by Verdaxis Intelligence Engine
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
};
