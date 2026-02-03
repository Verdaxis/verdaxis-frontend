import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, AlertTriangle, CheckCircle2, Box, X, Loader2 } from 'lucide-react';
import { InventoryItem } from '../types';
import { api } from '../services/api';
import { useCopilotContext } from '../context/CopilotContext';

export const SupplierInventory: React.FC = () => {
    const { setPageContext } = useCopilotContext();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    
    // Form state for adding new product
    const [newProductType, setNewProductType] = useState('Methanol');
    const [newStock, setNewStock] = useState('');
    const [newPrice, setNewPrice] = useState('');

    // Load inventory from API
    useEffect(() => {
        const loadInventory = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const data = await api.inventory.list();
                setInventory(data);
            } catch (err: any) {
                console.error('Failed to load inventory:', err);
                setError(err.message || 'Failed to load inventory');
            } finally {
                setIsLoading(false);
            }
        };
        loadInventory();
    }, []);

    // Broadcast Context
    useEffect(() => {
        const totalStock = inventory.reduce((sum, i) => sum + i.currentStock, 0);
        const lowStockCount = inventory.filter(i => i.status === 'Low Stock').length;
        const capacity = 15000; // Assumed max capacity
        const utilization = capacity > 0 ? Math.round((totalStock / capacity) * 100) : 0;
        
        setPageContext({
            view: 'Supplier Inventory',
            products: inventory.map(i => ({
                name: i.productName,
                stock: i.currentStock,
                status: i.status
            })),
            total_capacity: `${capacity.toLocaleString()} MT`,
            utilization: `${utilization}%`,
            summary: 'Live inventory levels and stock management.'
        });
    }, [inventory, setPageContext]);

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsAdding(true);
            const newItem = await api.inventory.add({
                productName: newProductType,
                portId: 'nl-rtm', // Default to Rotterdam
                portName: 'Rotterdam',
                currentStock: parseFloat(newStock) || 0,
                incomingStock: 0,
                pricePerMt: parseFloat(newPrice) || 0,
                status: 'Available'
            });
            setInventory([...inventory, newItem]);
            setIsAddModalOpen(false);
            // Reset form
            setNewProductType('Methanol');
            setNewStock('');
            setNewPrice('');
        } catch (err: any) {
            console.error('Failed to add inventory:', err);
            setError(err.message || 'Failed to add product');
        } finally {
            setIsAdding(false);
        }
    };

    // Calculate KPIs
    const totalStock = inventory.reduce((sum, i) => sum + i.currentStock, 0);
    const lowStockCount = inventory.filter(i => i.status === 'Low Stock').length;
    const capacity = 15000;
    const utilization = capacity > 0 ? Math.round((totalStock / capacity) * 100) : 0;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">Inventory Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Monitor stock levels, adjust pricing, and manage replenishment.</p>
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-[#334155] dark:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors flex items-center space-x-2"
                >
                    <Plus size={18} />
                    <span>Add Product</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-[#5DADE2]">
                        <Box size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Total Capacity</div>
                        <div className="text-xl font-bold text-[#334155] dark:text-white">{capacity.toLocaleString()} MT</div>
                    </div>
                </div>
                 <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center space-x-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-[#4CAF50]">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Utilization</div>
                        <div className="text-xl font-bold text-[#334155] dark:text-white">{utilization}%</div>
                    </div>
                </div>
                 <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-500">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Low Stock Alerts</div>
                        <div className="text-xl font-bold text-[#334155] dark:text-white">{lowStockCount} Product{lowStockCount !== 1 ? 's' : ''}</div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="animate-spin text-slate-400" size={32} />
                        <span className="ml-3 text-slate-500">Loading inventory...</span>
                    </div>
                ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                             <tr className="bg-slate-50 dark:bg-slate-900 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">
                                <th className="px-6 py-4">Product Name</th>
                                <th className="px-6 py-4">Location</th>
                                <th className="px-6 py-4">Stock Level (MT)</th>
                                <th className="px-6 py-4">Incoming</th>
                                <th className="px-6 py-4">Price / MT</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                             {inventory.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                    <td className="px-6 py-4 font-bold text-[#334155] dark:text-slate-200">{item.productName}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{item.portName}</td>
                                    <td className="px-6 py-4 font-mono font-medium dark:text-slate-300">{item.currentStock.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-slate-400">+{item.incomingStock.toLocaleString()}</td>
                                    <td className="px-6 py-4 font-medium text-[#334155] dark:text-slate-200">${item.pricePerMt}</td>
                                    <td className="px-6 py-4">
                                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                             item.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                         }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            className="text-[#5DADE2] hover:text-[#4FA3D9] font-bold text-xs flex items-center justify-end space-x-1 ml-auto"
                                            title="🚧 Edit details - Feature under construction"
                                        >
                                            <Edit2 size={14} />
                                            <span>Edit</span>
                                        </button>
                                    </td>
                                </tr>
                             ))}
                        </tbody>
                    </table>
                </div>
                )}
            </div>

            {/* Add Product Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                     <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-['Montserrat'] font-bold text-[#334155]">Add New Product</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddProduct}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Type</label>
                                    <select 
                                        value={newProductType}
                                        onChange={(e) => setNewProductType(e.target.value)}
                                        className="w-full p-2 border border-slate-200 rounded bg-slate-50 text-sm font-medium"
                                    >
                                        <option value="Methanol">Methanol</option>
                                        <option value="Biofuel">Biofuel B24</option>
                                        <option value="LNG">LNG</option>
                                        <option value="LSMGO">LSMGO</option>
                                        <option value="Ammonia">Ammonia</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location</label>
                                    <input type="text" value="Rotterdam" disabled className="w-full p-2 border border-slate-200 rounded bg-slate-100 text-slate-500 text-sm font-medium" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Initial Stock (MT)</label>
                                        <input 
                                            type="number" 
                                            value={newStock}
                                            onChange={(e) => setNewStock(e.target.value)}
                                            className="w-full p-2 border border-slate-200 rounded bg-white text-sm font-medium" 
                                            placeholder="0" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price / MT ($)</label>
                                        <input 
                                            type="number" 
                                            value={newPrice}
                                            onChange={(e) => setNewPrice(e.target.value)}
                                            className="w-full p-2 border border-slate-200 rounded bg-white text-sm font-medium" 
                                            placeholder="0.00" 
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3 rounded-b-2xl">
                                <button 
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 font-bold hover:text-slate-800 text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isAdding}
                                    className="px-4 py-2 bg-[#334155] hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm text-sm disabled:opacity-50 flex items-center space-x-2"
                                >
                                    {isAdding && <Loader2 className="animate-spin" size={16} />}
                                    <span>{isAdding ? 'Adding...' : 'Add to Inventory'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};