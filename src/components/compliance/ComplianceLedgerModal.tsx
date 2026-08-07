import React from 'react';
import { ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ComplianceLedgerModalProps {
    onClose: () => void;
}

export const ComplianceLedgerModal: React.FC<ComplianceLedgerModalProps> = ({ onClose }) => {
    const { t, i18n } = useTranslation('compliance');
    const typeKeys: Record<string, string> = { Purchase: 'purchase', Surrender: 'surrender', Transfer: 'transfer' };
    const itemKeys: Record<string, string> = { 'EUA Spot': 'euaSpot', 'Compliance Q3': 'complianceQ3', 'FuelEU Credit': 'fuelEuCredit', 'EUA Futures': 'euaFutures' };
    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-['Montserrat'] font-bold text-[#334155]">{t('ledger.title')}</h3>
                    <button onClick={onClose} aria-label={t('ledger.close')} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-xs uppercase text-slate-500 font-bold tracking-wider">
                                <th className="px-6 py-4">{t('ledger.date')}</th>
                                <th className="px-6 py-4">{t('ledger.type')}</th>
                                <th className="px-6 py-4">{t('ledger.counterparty')}</th>
                                <th className="px-6 py-4">{t('ledger.volume')}</th>
                                <th className="px-6 py-4">{t('ledger.price')}</th>
                                <th className="px-6 py-4 text-right">{t('ledger.total')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {[
                                { date: '2023-10-15', type: 'Purchase', item: 'EUA Spot', party: 'EEX Exchange', vol: '+500', price: '€85.50', total: '-€42,750' },
                                { date: '2023-09-30', type: 'Surrender', item: 'Compliance Q3', party: 'Union Registry', vol: '-850', price: '-', total: '-' },
                                { date: '2023-08-22', type: 'Transfer', item: 'FuelEU Credit', party: 'Verdaxis Pool', vol: '+120', price: '€450.00', total: '-€54,000' },
                                { date: '2023-08-10', type: 'Purchase', item: 'EUA Futures', party: 'ICE Endex', vol: '+1,000', price: '€82.10', total: '-€82,100' },
                            ].map((tx, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-slate-600">{new Date(`${tx.date}T00:00:00Z`).toLocaleDateString(i18n.language, { timeZone: 'UTC' })}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            {tx.type === 'Surrender' ? <ArrowUpRight size={14} className="text-amber-500" /> : <ArrowDownLeft size={14} className="text-green-500" />}
                                            <span className="font-bold text-[#334155]">{t(`ledger.${typeKeys[tx.type]}`)}</span>
                                        </div>
                                        <div className="text-xs text-slate-500">{t(`ledger.${itemKeys[tx.item]}`)}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{tx.party}</td>
                                    <td className={`px-6 py-4 font-mono font-bold ${tx.vol.startsWith('-') ? 'text-red-500' : 'text-green-600'}`}>{tx.vol}</td>
                                    <td className="px-6 py-4 text-slate-600">{tx.price}</td>
                                    <td className="px-6 py-4 text-right font-mono font-medium text-[#334155]">{tx.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                     <button 
                        className="px-6 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-white transition-colors"
                        title={t('ledger.exportUnavailable')}
                    >
                        {t('ledger.export')}
                    </button>
                </div>
            </div>
        </div>
    );
};
