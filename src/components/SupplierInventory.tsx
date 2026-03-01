import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, AlertTriangle, CheckCircle2, Box, X, Loader2, Send, Trash2 } from 'lucide-react';
import { InventoryItem, Port } from '../types';
import { api } from '../services/api';
import { useCopilotContext } from '../context/CopilotContext';

export const SupplierInventory: React.FC = () => {
    const { setPageContext } = useCopilotContext();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // Publish state: track which items are being published and which succeeded
    const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set());
    const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
    const [publishError, setPublishError] = useState<string | null>(null);

    // Edit modal state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [editProductName, setEditProductName] = useState('');
    const [editCurrentStock, setEditCurrentStock] = useState('');
    const [editIncomingStock, setEditIncomingStock] = useState('');
    const [editPrice, setEditPrice] = useState('');

    // Delete confirmation state
    const [deleteConfirmItem, setDeleteConfirmItem] = useState<InventoryItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Ports data for location selector
    const [ports, setPorts] = useState<Port[]>([]);

    // Form state for adding new product
    const [newProductType, setNewProductType] = useState('Methanol');
    const [selectedPortId, setSelectedPortId] = useState('');
    const [newStock, setNewStock] = useState('');
    const [newPrice, setNewPrice] = useState('');

    // Load inventory and ports from API
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const [inventoryData, portsData] = await Promise.all([
                    api.inventory.list(),
                    api.ports.list()
                ]);
                setInventory(inventoryData);
                setPorts(portsData);
            } catch (err: any) {
                console.error('Failed to load data:', err);
                setError(err.message || 'Failed to load inventory');
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
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
        const selectedPort = ports.find(p => p.id === selectedPortId);
        try {
            setIsAdding(true);
            const newItem = await api.inventory.add({
                productName: newProductType,
                portId: selectedPortId,
                portName: selectedPort?.name || selectedPortId,
                currentStock: parseFloat(newStock) || 0,
                incomingStock: 0,
                pricePerMt: parseFloat(newPrice) || 0,
                status: 'Available'
            });
            setInventory([...inventory, newItem]);
            setIsAddModalOpen(false);
            // Reset form
            setNewProductType('Methanol');
            setSelectedPortId('');
            setNewStock('');
            setNewPrice('');
        } catch (err: any) {
            console.error('Failed to add inventory:', err);
            setError(err.message || 'Failed to add product');
        } finally {
            setIsAdding(false);
        }
    };

    const openEditModal = (item: InventoryItem) => {
        setEditingItem(item);
        setEditProductName(item.productName);
        setEditCurrentStock(String(item.currentStock));
        setEditIncomingStock(String(item.incomingStock));
        setEditPrice(String(item.pricePerMt));
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingItem(null);
        setEditProductName('');
        setEditCurrentStock('');
        setEditIncomingStock('');
        setEditPrice('');
    };

    const handleEditProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;

        try {
            setIsEditing(true);
            setError(null);

            const updatedFields: Record<string, any> = {};
            const newName = editProductName.trim();
            const newStock = parseFloat(editCurrentStock);
            const newIncoming = parseFloat(editIncomingStock);
            const newPriceParsed = parseFloat(editPrice);

            if (newName && newName !== editingItem.productName) {
                updatedFields.product_name = newName;
            }
            if (!isNaN(newStock) && newStock !== editingItem.currentStock) {
                updatedFields.current_stock_mt = newStock;
            }
            if (!isNaN(newIncoming) && newIncoming !== editingItem.incomingStock) {
                updatedFields.incoming_stock_mt = newIncoming;
            }
            if (!isNaN(newPriceParsed) && newPriceParsed !== editingItem.pricePerMt) {
                updatedFields.price_per_mt_usd = newPriceParsed;
            }

            if (Object.keys(updatedFields).length === 0) {
                closeEditModal();
                return;
            }

            await api.inventory.update(editingItem.id, updatedFields);

            // Refresh inventory list from server to get accurate state
            const refreshed = await api.inventory.list();
            setInventory(refreshed);
            closeEditModal();
        } catch (err: any) {
            console.error('Failed to update inventory:', err);
            setError(err.message || 'Failed to update product');
        } finally {
            setIsEditing(false);
        }
    };

    const handlePublish = async (itemId: string) => {
        try {
            setPublishError(null);
            setPublishingIds(prev => new Set(prev).add(itemId));
            await api.inventory.publish(itemId);
            setPublishedIds(prev => new Set(prev).add(itemId));
            // Auto-clear the "Listed" feedback after 4 seconds
            setTimeout(() => {
                setPublishedIds(prev => {
                    const next = new Set(prev);
                    next.delete(itemId);
                    return next;
                });
            }, 4000);
        } catch (err: any) {
            console.error('Failed to publish inventory item:', err);
            setPublishError(err.message || 'Failed to publish as listing');
        } finally {
            setPublishingIds(prev => {
                const next = new Set(prev);
                next.delete(itemId);
                return next;
            });
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirmItem) return;
        try {
            setIsDeleting(true);
            setError(null);
            await api.inventory.delete(deleteConfirmItem.id);
            setInventory(prev => prev.filter(i => i.id !== deleteConfirmItem.id));
            setDeleteConfirmItem(null);
        } catch (err: any) {
            console.error('Failed to delete inventory item:', err);
            setError(err.message || 'Failed to delete product');
        } finally {
            setIsDeleting(false);
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

            {publishError && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 flex justify-between items-center">
                    <span>{publishError}</span>
                    <button onClick={() => setPublishError(null)} className="text-red-400 hover:text-red-600 dark:hover:text-red-200 ml-4">
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="animate-spin text-slate-400" size={32} />
                        <span className="ml-3 text-slate-500">Loading inventory...</span>
                    </div>
                ) : inventory.length === 0 ? (
                    <div className="text-center py-16">
                        <Box className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">No products in inventory</h3>
                        <p className="text-slate-400 dark:text-slate-500 mt-1">Add your first product to start managing stock levels.</p>
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
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{ports.find(p => p.id === item.portId)?.name || item.portName}</td>
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
                                        <div className="flex items-center justify-end space-x-3">
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className="text-[#5DADE2] hover:text-[#4FA3D9] font-bold text-xs flex items-center space-x-1"
                                                title="Edit inventory item"
                                            >
                                                <Edit2 size={14} />
                                                <span>Edit</span>
                                            </button>
                                            <button
                                                onClick={() => handlePublish(item.id)}
                                                disabled={publishingIds.has(item.id) || publishedIds.has(item.id)}
                                                className={`font-bold text-xs flex items-center space-x-1 transition-colors ${
                                                    publishedIds.has(item.id)
                                                        ? 'text-emerald-500 dark:text-emerald-400 cursor-default'
                                                        : publishingIds.has(item.id)
                                                        ? 'text-slate-400 dark:text-slate-500 cursor-wait'
                                                        : 'text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300'
                                                }`}
                                                title={publishedIds.has(item.id) ? 'Published to marketplace' : 'Publish as marketplace listing'}
                                            >
                                                {publishingIds.has(item.id) ? (
                                                    <Loader2 className="animate-spin" size={14} />
                                                ) : publishedIds.has(item.id) ? (
                                                    <CheckCircle2 size={14} />
                                                ) : (
                                                    <Send size={14} />
                                                )}
                                                <span>
                                                    {publishingIds.has(item.id)
                                                        ? 'Publishing...'
                                                        : publishedIds.has(item.id)
                                                        ? 'Listed'
                                                        : 'Publish'}
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirmItem(item)}
                                                className="text-rose-500 hover:text-rose-400 dark:text-rose-400 dark:hover:text-rose-300 font-bold text-xs flex items-center space-x-1 transition-colors"
                                                title="Delete inventory item"
                                            >
                                                <Trash2 size={14} />
                                                <span>Delete</span>
                                            </button>
                                        </div>
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
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onKeyDown={(e) => e.stopPropagation()}>
                     <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">Add New Product</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddProduct}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Product Type</label>
                                    <select
                                        autoFocus
                                        value={newProductType}
                                        onChange={(e) => setNewProductType(e.target.value)}
                                        className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-sm font-medium text-slate-800 dark:text-white"
                                    >
                                        <option value="Methanol">Methanol</option>
                                        <option value="Biofuel">Biofuel B24</option>
                                        <option value="LNG">LNG</option>
                                        <option value="LSMGO">LSMGO</option>
                                        <option value="Ammonia">Ammonia</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Location</label>
                                    <select
                                        value={selectedPortId}
                                        onChange={(e) => setSelectedPortId(e.target.value)}
                                        required
                                        className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-sm font-medium text-slate-800 dark:text-white"
                                    >
                                        <option value="" disabled>Select a port...</option>
                                        {ports.map((port) => (
                                            <option key={port.id} value={port.id}>{port.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Initial Stock (MT)</label>
                                        <input
                                            type="number"
                                            value={newStock}
                                            onChange={(e) => setNewStock(e.target.value)}
                                            className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm font-medium text-slate-800 dark:text-white"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Price / MT ($)</label>
                                        <input
                                            type="number"
                                            value={newPrice}
                                            onChange={(e) => setNewPrice(e.target.value)}
                                            className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm font-medium text-slate-800 dark:text-white"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-3 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-slate-200 text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isAdding}
                                    className="px-4 py-2 bg-[#334155] hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white font-bold rounded-lg shadow-sm text-sm disabled:opacity-50 flex items-center space-x-2"
                                >
                                    {isAdding && <Loader2 className="animate-spin" size={16} />}
                                    <span>{isAdding ? 'Adding...' : 'Add to Inventory'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmItem && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onKeyDown={(e) => e.stopPropagation()}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">Confirm Deletion</h3>
                            <button onClick={() => setDeleteConfirmItem(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Are you sure you want to remove <span className="font-bold text-[#334155] dark:text-white">{deleteConfirmItem.productName}</span> from inventory? This action cannot be undone.
                            </p>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-3 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmItem(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-slate-200 text-sm disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600 text-white font-bold rounded-lg shadow-sm text-sm disabled:opacity-50 flex items-center space-x-2"
                            >
                                {isDeleting && <Loader2 className="animate-spin" size={16} />}
                                <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {isEditModalOpen && editingItem && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onKeyDown={(e) => e.stopPropagation()}>
                     <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">Edit Product</h3>
                            <button onClick={closeEditModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleEditProduct}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Product Name</label>
                                    <select
                                        value={editProductName}
                                        onChange={(e) => setEditProductName(e.target.value)}
                                        className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-sm font-medium text-slate-800 dark:text-white"
                                    >
                                        <option value="Methanol">Methanol</option>
                                        <option value="Biofuel">Biofuel B24</option>
                                        <option value="LNG">LNG</option>
                                        <option value="LSMGO">LSMGO</option>
                                        <option value="Ammonia">Ammonia</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={ports.find(p => p.id === editingItem.portId)?.name || editingItem.portName}
                                        disabled
                                        className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-sm font-medium"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Current Stock (MT)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editCurrentStock}
                                            onChange={(e) => setEditCurrentStock(e.target.value)}
                                            className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm font-medium text-slate-800 dark:text-white"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Incoming Stock (MT)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editIncomingStock}
                                            onChange={(e) => setEditIncomingStock(e.target.value)}
                                            className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm font-medium text-slate-800 dark:text-white"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Price / MT ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editPrice}
                                        onChange={(e) => setEditPrice(e.target.value)}
                                        className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-sm font-medium text-slate-800 dark:text-white"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-3 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-slate-200 text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isEditing}
                                    className="px-4 py-2 bg-[#334155] hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white font-bold rounded-lg shadow-sm text-sm disabled:opacity-50 flex items-center space-x-2"
                                >
                                    {isEditing && <Loader2 className="animate-spin" size={16} />}
                                    <span>{isEditing ? 'Saving...' : 'Save Changes'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
