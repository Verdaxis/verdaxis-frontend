import React from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { Check, X, BellOff, Info, MessageSquare, Briefcase, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Notification } from '../../types';

interface NotificationListProps {
    onClose: () => void;
}

export const NotificationList: React.FC<NotificationListProps> = ({ onClose }) => {
    const { notifications, markAsRead, markAllAsRead } = useNotifications();
    const navigate = useNavigate();

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
        
        // Handle context navigation
        if (notification.data) {
            if (notification.type === 'RFQ_MATCH' || notification.type === 'QUOTE_REQUEST' || notification.type === 'QUOTE_OFFER') {
                // Determine if buyer or supplier view and navigate appropriately
                // For now, simpler redirection
                if (notification.data.rfq_id) {
                     navigate('/dashboard', { state: { openRfqId: notification.data.rfq_id }}); // Example
                }
            }
        }
        onClose();
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'RFQ_MATCH': return <Briefcase size={16} className="text-blue-400" />;
            case 'QUOTE_REQUEST': return <MessageSquare size={16} className="text-emerald-400" />;
            case 'QUOTE_OFFER': return <Briefcase size={16} className="text-purple-400" />;
            case 'USER_STATUS': return <UserCheck size={16} className="text-yellow-400" />;
            default: return <Info size={16} className="text-slate-400" />;
        }
    };

    if (notifications.length === 0) {
        return (
            <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-4 w-full">
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                    <BellOff size={32} className="mb-2 opacity-50" />
                    <p className="text-sm">No notifications</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl w-full flex flex-col max-h-[500px]">
            <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm rounded-t-lg sticky top-0 z-10">
                <h3 className="font-semibold text-slate-200">Notifications</h3>
                <button 
                    onClick={() => markAllAsRead()}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                    <Check size={12} />
                    Mark all read
                </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
                {notifications.map((notification) => (
                    <div 
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={clsx(
                            "group p-3 rounded-md cursor-pointer transition-all border",
                            "hover:bg-slate-800",
                            notification.is_read 
                                ? "bg-transparent border-transparent opacity-70" 
                                : "bg-slate-800/40 border-slate-700/50"
                        )}
                    >
                        <div className="flex gap-3">
                            <div className="mt-1 shrink-0">
                                {getIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                    <h4 className={clsx("text-sm font-medium truncate", notification.is_read ? "text-slate-400" : "text-white")}>
                                        {notification.title}
                                    </h4>
                                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                        {new Date(notification.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                    {notification.message}
                                </p>
                            </div>
                            {!notification.is_read && (
                                <div className="shrink-0 self-center">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
