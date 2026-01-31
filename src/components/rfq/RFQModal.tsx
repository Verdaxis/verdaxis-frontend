import React, { useState, useEffect } from 'react';
import { X, Calendar, Anchor, Droplets } from 'lucide-react';
import { Port, Vessel } from '../../types';
import { api } from '../../services/api';

interface RFQModalProps {
    isOpen: boolean;
    onClose: () => void;
    port: Port | null;
}

export const RFQModal: React.FC<RFQModalProps> = ({ isOpen, onClose, port }) => {
    const [loading, setLoading] = useState(false);
    const [vessels, setVessels] = useState<Vessel[]>([]);
    
    // Form State
    const [vesselId, setVesselId] = useState('');
    const [fuelType, setFuelType] = useState('Methanol');
    const [quantity, setQuantity] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Load user's vessels
            api.vessels.list().then(setVessels).catch(console.error);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!port || !vesselId || !quantity || !deliveryDate) return;

        setLoading(true);
        try {
            await api.quotes.create({
                portId: port.id,
                fuelType: fuelType as any,
                quantity: Number(quantity),
                deliveryDate: deliveryDate,
                vesselId: vesselId,
                status: 'Pending'
            });
            onClose();
            alert('Request for Quote sent successfully! Suppliers will be notified.');
        } catch (err: any) {
            console.error(err);
            alert('Failed to send request: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !port) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Request Quote</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">for {port.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Vessel Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Vessel</label>
                        <div className="relative">
                            <Anchor className="absolute left-3 top-3 text-slate-400" size={16} />
                            <select 
                                value={vesselId}
                                onChange={(e) => setVesselId(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all dark:text-white"
                                required
                            >
                                <option value="">-- Choose Vessel --</option>
                                {vessels.map(v => (
                                    <option key={v.id} value={v.id}>{v.name} ({v.vesselType})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Fuel Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fuel Type</label>
                            <div className="relative">
                                <Droplets className="absolute left-3 top-3 text-slate-400" size={16} />
                                <select 
                                    value={fuelType}
                                    onChange={(e) => setFuelType(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                                >
                                    <option value="Methanol">Methanol</option>
                                    <option value="Biofuel">Biofuel</option>
                                    <option value="LNG">LNG</option>
                                    <option value="Ammonia">Ammonia</option>
                                    <option value="LSMGO">LSMGO</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity (MT)</label>
                            <input 
                                type="number" 
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="w-full pl-4 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                                placeholder="e.g. 500"
                                required
                            />
                        </div>
                    </div>

                    {/* Delivery Date */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Delivery Window Start</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-3 text-slate-400" size={16} />
                            <input 
                                type="date" 
                                value={deliveryDate}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/20 transition-colors disabled:opacity-50 flex justify-center items-center"
                        >
                            {loading ? 'Sending...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
