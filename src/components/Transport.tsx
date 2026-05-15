import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { TransportVehicle, TransportRoute, UserProfile, Student } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { 
  Bus, 
  MapPin, 
  Plus, 
  Search, 
  Filter,
  MoreVertical, 
  Trash2, 
  X, 
  Loader2, 
  Users, 
  Phone, 
  User,
  Navigation,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface TransportProps {
  profile: UserProfile | null;
}

interface TransportFee {
  id?: string;
  feeType: string;
  amount: number;
  dueDate: string;
  campusId: string;
}

export default function Transport({ profile }: TransportProps) {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'routes' | 'fees'>('vehicles');
  const [vehicles, setVehicles] = useState<TransportVehicle[]>([]);
  const [routes, setRoutes] = useState<TransportRoute[]>([]);
  const [fees, setFees] = useState<TransportFee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<TransportVehicle | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<TransportRoute | null>(null);
  const [selectedFee, setSelectedFee] = useState<TransportFee | null>(null);
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<'all' | 'active' | 'maintenance' | 'inactive'>('all');
  const [vehicleSortBy, setVehicleSortBy] = useState<'vehicleNumber' | 'driverName' | 'status'>('vehicleNumber');
  const [vehicleSortOrder, setVehicleSortOrder] = useState<'asc' | 'desc'>('asc');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [vehicleFormData, setVehicleFormData] = useState<Partial<TransportVehicle>>({
    vehicleNumber: '',
    capacity: 0,
    driverName: '',
    driverContact: '',
    status: 'active',
    campusId: profile?.campusId || 'main',
  });

  const [routeFormData, setRouteFormData] = useState<Partial<TransportRoute>>({
    routeName: '',
    vehicleId: '',
    stops: [],
    campusId: profile?.campusId || 'main',
  });

  const [feeFormData, setFeeFormData] = useState<Partial<TransportFee>>({
    feeType: '',
    amount: 0,
    dueDate: '',
    campusId: profile?.campusId || 'main',
  });

  const [newStop, setNewStop] = useState('');

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const qConstraints = [where('campusId', '==', profile?.campusId || 'main')];
      if (profile?.schoolId) {
        qConstraints.push(where('schoolId', '==', profile.schoolId));
      }

      const vehicleSnap = await getDocs(query(collection(db, 'transport_vehicles'), ...qConstraints));
      const routeSnap = await getDocs(query(collection(db, 'transport_routes'), ...qConstraints));
      const feeSnap = await getDocs(query(collection(db, 'transport_fees'), ...qConstraints));
      const studentSnap = await getDocs(query(collection(db, 'students'), ...qConstraints));

      setVehicles(vehicleSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransportVehicle)));
      setRoutes(routeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransportRoute)));
      setFees(feeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransportFee)));
      setStudents(studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    } catch (err) {
      console.error("Error fetching transport data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEditMode && selectedVehicle?.id) {
        await setDoc(doc(db, 'transport_vehicles', selectedVehicle.id), vehicleFormData, { merge: true });
      } else {
        await addDoc(collection(db, 'transport_vehicles'), {
          ...vehicleFormData,
          schoolId: profile?.schoolId || ''
        });
      }
      setIsVehicleModalOpen(false);
      fetchData();
    } catch (err: any) {
      handleFirestoreError(err, isEditMode ? OperationType.UPDATE : OperationType.CREATE, 'transport_vehicles');
    } finally {
      setSaving(false);
    }
  };

  const handleRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEditMode && selectedRoute?.id) {
        await setDoc(doc(db, 'transport_routes', selectedRoute.id), routeFormData, { merge: true });
      } else {
        await addDoc(collection(db, 'transport_routes'), {
          ...routeFormData,
          schoolId: profile?.schoolId || ''
        });
      }
      setIsRouteModalOpen(false);
      fetchData();
    } catch (err: any) {
      handleFirestoreError(err, isEditMode ? OperationType.UPDATE : OperationType.CREATE, 'transport_routes');
    } finally {
      setSaving(false);
    }
  };

  const handleFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEditMode && selectedFee?.id) {
        await setDoc(doc(db, 'transport_fees', selectedFee.id), feeFormData, { merge: true });
      } else {
        await addDoc(collection(db, 'transport_fees'), {
          ...feeFormData,
          schoolId: profile?.schoolId || ''
        });
      }
      setIsFeeModalOpen(false);
      fetchData();
    } catch (err: any) {
      handleFirestoreError(err, isEditMode ? OperationType.UPDATE : OperationType.CREATE, 'transport_fees');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      await deleteDoc(doc(db, 'transport_vehicles', id));
      fetchData();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, 'transport_vehicles');
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!confirm("Are you sure you want to delete this route?")) return;
    try {
      await deleteDoc(doc(db, 'transport_routes', id));
      fetchData();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, 'transport_routes');
    }
  };

  const handleDeleteFee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this fee?")) return;
    try {
      await deleteDoc(doc(db, 'transport_fees', id));
      fetchData();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, 'transport_fees');
    }
  };

  const addStop = () => {
    if (newStop.trim()) {
      setRouteFormData({
        ...routeFormData,
        stops: [...(routeFormData.stops || []), newStop.trim()]
      });
      setNewStop('');
    }
  };

  const removeStop = (index: number) => {
    const updatedStops = [...(routeFormData.stops || [])];
    updatedStops.splice(index, 1);
    setRouteFormData({ ...routeFormData, stops: updatedStops });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Transport Management</h1>
          <p className="text-slate-500 font-medium">Manage school buses, routes, and student transport assignments.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => {
              setIsEditMode(false);
              setVehicleFormData({
                vehicleNumber: '',
                capacity: 0,
                driverName: '',
                driverContact: '',
                status: 'active',
                campusId: profile?.campusId || 'main',
              });
              setIsVehicleModalOpen(true);
            }}
            className="flex-1 md:flex-none btn-primary flex items-center justify-center gap-2 text-xs md:text-sm"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            Add Vehicle
          </button>
          <button 
            onClick={() => {
              setIsEditMode(false);
              setRouteFormData({
                routeName: '',
                vehicleId: '',
                stops: [],
                campusId: profile?.campusId || 'main',
              });
              setIsRouteModalOpen(true);
            }}
            className="flex-1 md:flex-none btn-secondary flex items-center justify-center gap-2 text-xs md:text-sm"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            Add Route
          </button>
          <button 
            onClick={() => {
              setIsEditMode(false);
              setFeeFormData({
                feeType: '',
                amount: 0,
                dueDate: '',
                campusId: profile?.campusId || 'main',
              });
              setIsFeeModalOpen(true);
            }}
            className="flex-1 md:flex-none btn-secondary flex items-center justify-center gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-xs md:text-sm"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            Add Fee
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto pb-1 scrollbar-hide border-b border-slate-200">
        <div className="flex gap-8 whitespace-nowrap min-w-max">
          <button
            onClick={() => setActiveTab('vehicles')}
            className={cn(
              "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative px-1",
              activeTab === 'vehicles' ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Vehicles & Drivers
            {activeTab === 'vehicles' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={cn(
              "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative px-1",
              activeTab === 'routes' ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Routes & Stops
            {activeTab === 'routes' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className={cn(
              "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative px-1",
              activeTab === 'fees' ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Transport Fees
            {activeTab === 'fees' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-500 font-bold animate-pulse">Loading transport data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'vehicles' && (
            <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-slate-400 shrink-0" />
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {(['all', 'active', 'maintenance', 'inactive'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setVehicleStatusFilter(status)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                        vehicleStatusFilter === status
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                          : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto md:ml-auto">
                <select
                  className="flex-1 md:w-auto input-field py-2 text-xs"
                  value={vehicleSortBy}
                  onChange={e => setVehicleSortBy(e.target.value as any)}
                >
                  <option value="vehicleNumber">Sort by Vehicle No.</option>
                  <option value="driverName">Sort by Driver</option>
                  <option value="status">Sort by Status</option>
                </select>
                <button
                  onClick={() => setVehicleSortOrder(vehicleSortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  {vehicleSortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            {activeTab === 'vehicles' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vehicles
                  .filter(v => vehicleStatusFilter === 'all' || v.status === vehicleStatusFilter)
                  .sort((a, b) => {
                    let comparison = 0;
                    if (vehicleSortBy === 'vehicleNumber') comparison = a.vehicleNumber.localeCompare(b.vehicleNumber);
                    else if (vehicleSortBy === 'driverName') comparison = a.driverName.localeCompare(b.driverName);
                    else if (vehicleSortBy === 'status') comparison = a.status.localeCompare(b.status);
                    return vehicleSortOrder === 'asc' ? comparison : -comparison;
                  })
                  .map(vehicle => {
                    const assignedStudents = students.filter(s => s.busNumber === vehicle.vehicleNumber);
                    return (
                      <motion.div
                        key={vehicle.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all group"
                      >
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                        <Bus className="w-8 h-8" />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setSelectedVehicle(vehicle);
                            setVehicleFormData(vehicle);
                            setIsEditMode(true);
                            setIsVehicleModalOpen(true);
                          }}
                          className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => vehicle.id && handleDeleteVehicle(vehicle.id)}
                          className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{vehicle.vehicleNumber}</h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                          vehicle.status === 'active' ? "bg-emerald-100 text-emerald-700" : vehicle.status === 'maintenance' ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                        )}>
                          {vehicle.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Driver</p>
                          <p className="font-bold text-slate-900 truncate">{vehicle.driverName}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Capacity</p>
                          <p className="font-bold text-slate-900">{assignedStudents.length} / {vehicle.capacity}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
                        <Phone className="w-4 h-4" />
                        {vehicle.driverContact}
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {assignedStudents.slice(0, 5).map((s, i) => (
                            <div key={s.id} className="w-8 h-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                              {s.name[0]}
                            </div>
                          ))}
                          {assignedStudents.length > 5 && (
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                              +{assignedStudents.length - 5}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Students</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : activeTab === 'fees' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fees.map(fee => (
                <motion.div
                  key={fee.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                      <span className="text-2xl font-black">$</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setSelectedFee(fee);
                          setFeeFormData(fee);
                          setIsEditMode(true);
                          setIsFeeModalOpen(true);
                        }}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => fee.id && handleDeleteFee(fee.id)}
                        className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">{fee.feeType}</h3>
                      <p className="text-3xl font-black text-emerald-600 mt-2">${fee.amount.toLocaleString()}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Due Date</p>
                      <p className="font-bold text-slate-900">{new Date(fee.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              {fees.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-[32px] border border-slate-100">
                  No transport fees defined yet.
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {routes.map(route => {
                const vehicle = vehicles.find(v => v.id === route.vehicleId);
                return (
                  <motion.div
                    key={route.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all"
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                          <Navigation className="w-8 h-8" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-slate-900 tracking-tight">{route.routeName}</h3>
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                            {vehicle ? `Bus: ${vehicle.vehicleNumber}` : 'No Bus Assigned'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setSelectedRoute(route);
                            setRouteFormData(route);
                            setIsEditMode(true);
                            setIsRouteModalOpen(true);
                          }}
                          className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => route.id && handleDeleteRoute(route.id)}
                          className="p-2 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="relative pl-8 space-y-6">
                      <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100 border-l-2 border-dashed border-slate-200" />
                      {route.stops.map((stop, index) => (
                        <div key={index} className="relative flex items-center gap-4">
                          <div className={cn(
                            "absolute -left-[23px] w-4 h-4 rounded-full border-2 border-white shadow-sm z-10",
                            index === 0 ? "bg-emerald-500" : index === route.stops.length - 1 ? "bg-indigo-600" : "bg-slate-300"
                          )} />
                          <div className="flex-1 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                            <p className="font-bold text-slate-900">{stop}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stop {index + 1}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Vehicle Modal */}
      <AnimatePresence>
        {isVehicleModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsVehicleModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <h2 className="text-2xl font-black tracking-tight">{isEditMode ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
                <button onClick={() => setIsVehicleModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleVehicleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Vehicle Number</label>
                    <input
                      required
                      type="text"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      value={vehicleFormData.vehicleNumber}
                      onChange={e => setVehicleFormData({...vehicleFormData, vehicleNumber: e.target.value})}
                      placeholder="e.g. BUS-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Capacity</label>
                    <input
                      required
                      type="number"
                      min="1"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      value={vehicleFormData.capacity || ''}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setVehicleFormData({...vehicleFormData, capacity: isNaN(val) ? 0 : val});
                      }}
                      placeholder="e.g. 40"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Driver Name</label>
                    <input
                      required
                      type="text"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      value={vehicleFormData.driverName}
                      onChange={e => setVehicleFormData({...vehicleFormData, driverName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Driver Contact</label>
                    <input
                      required
                      type="tel"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      value={vehicleFormData.driverContact}
                      onChange={e => setVehicleFormData({...vehicleFormData, driverContact: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Status</label>
                    <select
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      value={vehicleFormData.status}
                      onChange={e => setVehicleFormData({...vehicleFormData, status: e.target.value as any})}
                    >
                      <option value="active">Active</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsVehicleModalOpen(false)} className="flex-1 px-6 py-4 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 px-6 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                    {saving ? 'Saving...' : isEditMode ? 'Update Vehicle' : 'Add Vehicle'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Route Modal */}
      <AnimatePresence>
        {isRouteModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsRouteModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-amber-500 text-white">
                <h2 className="text-2xl font-black tracking-tight">{isEditMode ? 'Edit Route' : 'Add New Route'}</h2>
                <button onClick={() => setIsRouteModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleRouteSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Route Name</label>
                    <input
                      required
                      type="text"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                      value={routeFormData.routeName}
                      onChange={e => setRouteFormData({...routeFormData, routeName: e.target.value})}
                      placeholder="e.g. North Sector Route"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Assign Vehicle</label>
                    <select
                      required
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                      value={routeFormData.vehicleId}
                      onChange={e => setRouteFormData({...routeFormData, vehicleId: e.target.value})}
                    >
                      <option value="">Select a vehicle</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.driverName})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Route Stops</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                        value={newStop}
                        onChange={e => setNewStop(e.target.value)}
                        placeholder="Add a stop..."
                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addStop())}
                      />
                      <button type="button" onClick={addStop} className="p-4 bg-amber-500 text-white rounded-2xl hover:bg-amber-600 transition-all">
                        <Plus className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {routeFormData.stops?.map((stop, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-black">
                              {index + 1}
                            </div>
                            <span className="font-bold text-slate-900">{stop}</span>
                          </div>
                          <button type="button" onClick={() => removeStop(index)} className="text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsRouteModalOpen(false)} className="flex-1 px-6 py-4 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 px-6 py-4 bg-amber-500 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                    {saving ? 'Saving...' : isEditMode ? 'Update Route' : 'Add Route'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fee Modal */}
      <AnimatePresence>
        {isFeeModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsFeeModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-emerald-500 text-white">
                <h2 className="text-2xl font-black tracking-tight">{isEditMode ? 'Edit Fee' : 'Add New Fee'}</h2>
                <button onClick={() => setIsFeeModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleFeeSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Fee Type / Name</label>
                    <input
                      required
                      type="text"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                      value={feeFormData.feeType}
                      onChange={e => setFeeFormData({...feeFormData, feeType: e.target.value})}
                      placeholder="e.g. Monthly Transport Fee"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Amount ($)</label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                      value={feeFormData.amount}
                      onChange={e => setFeeFormData({...feeFormData, amount: parseFloat(e.target.value)})}
                      placeholder="e.g. 150.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Due Date</label>
                    <input
                      required
                      type="date"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                      value={feeFormData.dueDate}
                      onChange={e => setFeeFormData({...feeFormData, dueDate: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsFeeModalOpen(false)} className="flex-1 px-6 py-4 text-slate-600 font-black uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 px-6 py-4 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                    {saving ? 'Saving...' : isEditMode ? 'Update Fee' : 'Add Fee'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
