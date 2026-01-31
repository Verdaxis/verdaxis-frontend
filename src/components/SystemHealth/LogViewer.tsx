import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Terminal, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { API_URL } from '../../services/config';

export const LogViewer: React.FC = () => {
    const { token } = useAuth();
    const [logs, setLogs] = useState<string[]>([]);
    const [autoScroll, setAutoScroll] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);

    const fetchLogs = async () => {
        try {
            const response = await fetch(`${API_URL}/dashboard/logs?lines=100`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (response.ok) {
                const data = await response.json();
                setLogs(data.logs);
            }
        } catch (error) {
            console.error("Failed to fetch logs", error);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (autoScroll && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, autoScroll]);

    return (
        <div className="flex flex-col h-[500px] bg-[#0d1117] rounded-xl border border-slate-700 shadow-xl overflow-hidden font-mono text-sm mt-8">
            <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-slate-700">
                <div className="flex items-center space-x-2">
                    <Terminal size={16} className="text-slate-400" />
                    <span className="font-bold text-slate-200">System Logs</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">tail -n 100</span>
                </div>
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`flex items-center space-x-1 text-xs font-bold px-2 py-1 rounded transition-colors ${autoScroll ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {autoScroll ? <Eye size={14} /> : <EyeOff size={14} />}
                        <span>{autoScroll ? 'Auto-scroll On' : 'Auto-scroll Off'}</span>
                    </button>
                    <button 
                        onClick={fetchLogs}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Refresh now"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {logs.length === 0 ? (
                    <div className="text-slate-500 italic">No logs available or connecting...</div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className="text-slate-300 whitespace-pre-wrap break-all hover:bg-white/5 px-2 py-0.5 rounded transition-colors">
                            <span className="text-slate-500 mr-2 select-none border-r border-slate-700 pr-2 w-8 inline-block text-right">{i+1}</span>
                            {log}
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};
