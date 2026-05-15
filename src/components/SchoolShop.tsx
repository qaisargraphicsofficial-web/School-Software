import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Plus, Package, FileText, Settings, Database, Trash2, MessageCircle } from 'lucide-react';
import { UserProfile, SchoolSettings } from '../types';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, increment, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface SchoolShopProps {
  profile: UserProfile | null;
}

export default function SchoolShop({ profile }: SchoolShopProps) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [items, setItems] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showNewSale, setShowNewSale] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: '', price: 0, cost: 0, stock: 0 });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [newSale, setNewSale] = useState({ studentId: '', studentName: '', fatherName: '', studentClass: '', paymentStatus: 'paid' as 'paid' | 'unpaid' });
  const [cart, setCart] = useState<{ itemId: string; name: string; price: number; quantity: number }[]>([]);
  const [cartItem, setCartItem] = useState({ itemId: '', quantity: 1 });
  const [showStockAdj, setShowStockAdj] = useState(false);
  const [stockAdj, setStockAdj] = useState({ itemId: '', adjustment: 0 });
  const [filterName, setFilterName] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (!profile?.schoolId) return;
    const campusId = profile.campusId || 'main';
    setLoading(true);

    const qConstraints = [where('schoolId', '==', profile.schoolId)];
    const campusConstraints = campusId !== 'all' ? [...qConstraints, where('campusId', '==', campusId)] : qConstraints;

    const itemsQuery = query(collection(db, 'shop_items'), ...campusConstraints);
    const salesQuery = query(collection(db, 'shop_sales'), ...campusConstraints);
    const studentsQuery = query(collection(db, 'students'), ...campusConstraints);
    const classesQuery = query(collection(db, 'classes'), ...campusConstraints);

    const unsubItems = onSnapshot(itemsQuery, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Error in shop_items listener:", err);
    });

    const unsubSales = onSnapshot(salesQuery, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Error in shop_sales listener:", err);
    });

    const unsubStudents = onSnapshot(studentsQuery, (snapshot) => {
      const studentDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentDocs);
      setLoading(false);
    }, (err) => {
      console.error("Error in shop students listener:", err);
    });

    const unsubClasses = onSnapshot(classesQuery, (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Error in shop classes listener:", err);
    });

    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as SchoolSettings);
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();

    return () => {
      unsubItems();
      unsubSales();
      unsubStudents();
      unsubClasses();
    };
  }, [profile]);

  // Derived list of all available classes
  const allAvailableClasses = React.useMemo(() => {
    const names = new Set<string>();
    
    classes.forEach(c => {
      const name = (c.className || c.name)?.toString().trim();
      if (name) names.add(name);
    });

    students.forEach(s => {
      const sClass = s.class?.toString().trim();
      if (sClass) names.add(sClass);
    });

    if (names.size === 0) {
      ['Nursery', 'KG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'].forEach(n => names.add(n));
    }

    return Array.from(names).filter(Boolean).sort((a, b) => {
        const DEFAULT_CLASSES = ['Nursery', 'KG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
        const idxA = DEFAULT_CLASSES.indexOf(a);
        const idxB = DEFAULT_CLASSES.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });
  }, [students, classes]);

  const handleStudentChange = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    setNewSale(prev => ({
        ...prev,
        studentId: student?.id || '',
        studentName: student?.name || '',
        fatherName: student?.parentName || student?.fatherName || '',
        studentClass: student?.class || prev.studentClass
    }));
  }

  const handleClassChange = (className: string) => {
    setNewSale(prev => ({ ...prev, studentClass: className, studentId: '', studentName: '', fatherName: '' }));
  }

  const addToCart = () => {
    const item = items.find(i => i.id === cartItem.itemId);
    if (!item) return alert('Select an item');
    if (item.stock < cartItem.quantity) return alert('Insufficient stock');
    
    setCart(prev => {
        const existing = prev.find(i => i.itemId === item.id);
        if (existing) {
            return prev.map(i => i.itemId === item.id ? { ...i, quantity: i.quantity + cartItem.quantity } : i);
        }
        return [...prev, { itemId: item.id, name: item.name, price: item.price, quantity: cartItem.quantity }];
    });
    setCartItem({ itemId: '', quantity: 1 });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.itemId !== itemId));
  };

  const handleAddItem = async () => {
    const newErrors: Record<string, string> = {};
    if (!newItem.name || !newItem.name.trim()) newErrors.name = "Item Name is required";
    if (!newItem.category || !newItem.category.trim()) newErrors.category = "Category is required";
    if (isNaN(Number(newItem.price)) || Number(newItem.price) < 0) newErrors.price = "Valid Sale Price is required";
    if (isNaN(Number(newItem.cost)) || Number(newItem.cost) < 0) newErrors.cost = "Valid Buying Price is required";
    if (isNaN(Number(newItem.stock)) || Number(newItem.stock) < 0) newErrors.stock = "Valid Stock Quantity is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});

    if (!profile?.campusId) {
      console.error("Critical Error: No campusId found in profile");
      alert("Error: Campus ID not found. Please ensure you are logged in.");
      return;
    }
    
    console.log("Validation passed. Attempting to write to Firestore...");

    try {
      const docRef = await addDoc(collection(db, 'shop_items'), { 
        name: newItem.name.trim(),
        category: newItem.category.trim(),
        price: Number(newItem.price), 
        cost: Number(newItem.cost),
        stock: Number(newItem.stock), 
        campusId: profile.campusId 
      });
      console.log("Item added successfully with ID:", docRef.id);
      
      // Reset UI state
      setShowAddItem(false);
      setShowCustomCategory(false);
      setNewItem({ name: '', category: '', price: 0, cost: 0, stock: 0 });
      setErrors({});
      
      // Refresh items list
      console.log("Refreshing inventory list...");
      const itemsSnap = await getDocs(query(collection(db, 'shop_items'), where('campusId', '==', profile.campusId)));
      setItems(itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      console.log("Inventory list refreshed");
      
    } catch (e) {
      console.error("Error adding item to Firestore:", e);
      alert("Failed to save item: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleNewSale = async () => {
    if (!profile?.campusId) return;
    if (cart.length === 0) return alert('Add items to cart first');
    if (!newSale.studentName || !newSale.fatherName || !newSale.studentClass) return alert('Please fill in all student details');
    
    setLoading(true);
    try {
        const receiptId = `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const salePromises = cart.map(async (item) => {
            // Add sale record
            await addDoc(collection(db, 'shop_sales'), {
                itemId: item.itemId,
                itemName: item.name,
                quantity: Number(item.quantity),
                totalAmount: item.price * Number(item.quantity),
                saleDate: new Date().toISOString().split('T')[0],
                studentId: newSale.studentId,
                studentName: newSale.studentName,
                fatherName: newSale.fatherName,
                studentClass: newSale.studentClass,
                campusId: profile.campusId,
                receiptId: receiptId,
                paymentStatus: newSale.paymentStatus
            });
            
            // Update stock
            await updateDoc(doc(db, 'shop_items', item.itemId), { stock: increment(-Number(item.quantity)) });
        });

        await Promise.all(salePromises);
        
        setShowNewSale(false);
        setNewSale({ studentId: '', studentName: '', fatherName: '', studentClass: '', paymentStatus: 'paid' });
        setCart([]);
        setCartItem({ itemId: '', quantity: 1 });
        
        alert('Sale completed successfully');
    } catch (error) {
        console.error("Error processing sale:", error);
        alert('Failed to process sale. Please try again.');
    } finally {
        setLoading(false);
    }
  };

  const openWhatsApp = (studentId: string, itemNames: string, amount: number) => {
    const student = students.find(s => s.id === studentId);
    
    // Check for whatsappNumber or contact field
    const rawPhone = student?.whatsappNumber || student?.contact || '';
    
    if (!student || !rawPhone) {
        alert("Student contact number not found. Please ensure the student has a WhatsApp number or Contact number saved in their profile.");
        return;
    }
    
    const phoneNumber = rawPhone.replace(/\D/g, ''); 
    
    // Pakistani numbers usually start with 0 or 92. Ensure correct format for wa.me
    let formattedPhone = phoneNumber;
    if (phoneNumber.startsWith('0')) {
        formattedPhone = '92' + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('92') && phoneNumber.length === 10) {
        formattedPhone = '92' + phoneNumber;
    }

    const message = `*Receipt Summary*\n\nHello ${student.name},\n\nYour purchase has been processed:\n- Items: ${itemNames}\n- Total Amount: PKR ${amount}\n\nThank you for shopping at our school shop!`;
    
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleStockAdjustment = async () => {
    if (!profile?.campusId) return;
    const item = items.find(i => i.id === stockAdj.itemId);
    if (!item) return;

    await updateDoc(doc(db, 'shop_items', item.id), { stock: increment(Number(stockAdj.adjustment)) });
    setShowStockAdj(false);
    setStockAdj({ itemId: '', adjustment: 0 });
    // Refresh items
    const itemsSnap = await getDocs(query(collection(db, 'shop_items'), where('campusId', '==', profile.campusId)));
    setItems(itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    await deleteDoc(doc(db, 'shop_items', itemId));
    // Refresh
    const itemsSnap = await getDocs(query(collection(db, 'shop_items'), where('campusId', '==', profile.campusId)));
    setItems(itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // Calculate metrics
  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.saleDate === today);
  const totalTodaySales = todaySales.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalCost = todaySales.reduce((acc, curr) => {
      const item = items.find(i => i.id === curr.itemId);
      return acc + (item ? item.cost * curr.quantity : 0);
  }, 0);
  const grossProfit = totalTodaySales - totalCost;
  const unpaidSalesTotal = sales.filter(s => s.paymentStatus === 'unpaid').reduce((acc, curr) => acc + curr.totalAmount, 0);

  const stats = [
    { name: "Today's Sales", value: `PKR ${totalTodaySales.toLocaleString()}`, sub: `${todaySales.length} items sold` },
    { name: 'Gross Profit', value: `PKR ${grossProfit.toLocaleString()}`, sub: 'From current sales' },
    { name: 'Unpaid Dues', value: `PKR ${unpaidSalesTotal.toLocaleString()}`, sub: 'Total credit sales' },
    { name: 'Low Stock', value: items.filter(i => i.stock < 10).length.toString(), sub: 'Items need review' },
  ];

  // Group unpaid sales by student for Overview
  const unpaidByStudent = React.useMemo(() => {
    const grouped: Record<string, any> = {};
    sales.filter(s => s.paymentStatus === 'unpaid').forEach(s => {
        const key = s.studentId || `${s.studentName}-${s.fatherName}`;
        if (!grouped[key]) {
            grouped[key] = {
                studentId: s.studentId,
                name: s.studentName,
                fatherName: s.fatherName,
                studentClass: s.studentClass,
                totalDue: 0,
                lastSaleDate: s.saleDate,
                items: []
            };
        }
        grouped[key].totalDue += s.totalAmount;
        grouped[key].items.push(s);
        if (new Date(s.saleDate) > new Date(grouped[key].lastSaleDate)) {
            grouped[key].lastSaleDate = s.saleDate;
        }
    });
    return Object.values(grouped);
  }, [sales]);

  const printBill = (studentData: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = studentData.items.map((item: any) => `
        <tr>
            <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${item.itemName}</td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 14px;">${item.quantity}</td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 14px; font-weight: 600;">PKR ${item.totalAmount.toLocaleString()}</td>
        </tr>
    `).join('');

    const schoolTitle = settings?.schoolName || profile?.campusId || 'School Shop';
    const issuerName = profile?.displayName || profile?.email?.split('@')[0] || 'Administrator';
    
    // Check if the user should be listed on the bill
    // Requirements: Principal, Head Teacher, Shop Manager or Admin should appear. Teachers should not.
    const allowedRoles = ['admin', 'administrator', 'principal', 'head teacher', 'manager', 'headmaster', 'headmistress', 'coordinator', 'director'];
    const userRole = profile?.role?.toLowerCase() || '';
    const userDisplayName = profile?.displayName?.toLowerCase() || '';
    
    const shouldShowIssuer = userRole === 'admin' || 
                             allowedRoles.some(r => userRole.includes(r)) || 
                             allowedRoles.some(r => userDisplayName.includes(r));

    printWindow.document.write(`
        <html>
            <head>
                <title>Receipt - ${studentData.name}</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 30px; color: #0f172a; line-height: 1.5; }
                    .container { max-width: 800px; margin: 0 auto; border: 1px solid #f1f5f9; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
                    .header { text-align: center; margin-bottom: 40px; border-bottom: 4px solid #6366f1; padding-bottom: 24px; }
                    .school-name { font-size: 28px; font-weight: 800; color: #1e293b; margin: 0; text-transform: uppercase; letter-spacing: -0.025em; }
                    .tagline { color: #6366f1; font-weight: 600; font-size: 14px; margin-top: 4px; }
                    .receipt-label { margin-top: 16px; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; color: #64748b; text-transform: uppercase; }
                    
                    .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
                    .info-box h4 { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0; }
                    .info-box p { margin: 2px 0; font-size: 15px; font-weight: 600; color: #334155; }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    th { text-align: left; background: #f8fafc; padding: 12px 8px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-top: 1px solid #e2e8f0; border-bottom: 2px solid #e2e8f0; }
                    
                    .totals-section { border-top: 2px solid #e2e8f0; padding-top: 20px; }
                    .total-row { display: flex; justify-content: flex-end; align-items: center; gap: 20px; }
                    .total-label { font-size: 14px; font-weight: 600; color: #64748b; }
                    .total-value { font-size: 24px; font-weight: 800; color: #6366f1; }
                    
                    .meta-footer { margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #e2e8f0; padding-top: 30px; }
                    .issuer-info { font-size: 13px; color: #475569; }
                    .stamp-area { width: 120px; height: 120px; border: 2px dashed #cbd5e1; border-radius: 50%; display: flex; items-center; justify-content: center; color: #cbd5e1; font-size: 10px; font-weight: 700; text-transform: uppercase; }
                    
                    .footer-note { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 11px; font-weight: 500; }
                    
                    @media print {
                        body { padding: 0; }
                        .container { border: none; box-shadow: none; width: 100%; max-width: 100%; padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 class="school-name">${schoolTitle}</h1>
                        <div class="tagline">Providing Excellence in Education</div>
                        <div class="receipt-label">Official Sale Receipt</div>
                    </div>
                    
                    <div class="info-grid">
                        <div class="info-box">
                            <h4>Billed To</h4>
                            <p>${studentData.name}</p>
                            <p style="font-size: 13px; color: #64748b; font-weight: 400;">S/O: ${studentData.fatherName}</p>
                            <p style="font-size: 13px; color: #64748b; font-weight: 400;">Class: ${studentData.studentClass}</p>
                        </div>
                        <div style="text-align: right;" class="info-box">
                            <h4>Receipt Details</h4>
                            <p>Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p style="font-size: 13px; color: #64748b; font-weight: 400;">No: ${Math.floor(100000 + Math.random() * 900000)}</p>
                        </div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Item Description</th>
                                <th style="text-align: center;">Quantity</th>
                                <th style="text-align: right;">Total Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                    
                    <div class="totals-section">
                        <div class="total-row">
                            <span class="total-label">Grand Total Paid</span>
                            <span class="total-value">PKR ${studentData.totalDue.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div class="meta-footer">
                        <div class="issuer-info">
                            ${shouldShowIssuer ? `
                                <p style="margin: 0; font-weight: 700; color: #1e293b;">Issued By:</p>
                                <p style="margin: 4px 0 0 0;">${issuerName}</p>
                                <p style="font-size: 11px; color: #64748b; text-transform: uppercase; margin: 2px 0 0 0;">${profile?.role || 'Staff'}</p>
                            ` : ''}
                            <p style="margin-top: 20px; font-size: 11px; font-weight: 600; color: #94a3b8;">Printed on: ${new Date().toLocaleString()}</p>
                        </div>
                        <div class="stamp-area">
                            <div style="text-align: center; transform: rotate(-15deg); border: 2px solid #cbd5e1; padding: 10px; border-radius: 8px;">
                                SCHOOL<br/>SHOP<br/>OFFICIAL
                            </div>
                        </div>
                    </div>
                    
                    <div class="footer-note">
                        This is a computer-generated document and does not require a physical signature.<br/>
                        For queries, contact the school office at ${settings?.schoolContact || ''}
                    </div>
                </div>
                <script>
                    window.onload = () => {
                        window.print();
                        setTimeout(() => window.close(), 500);
                    }
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
  };

  const handleMarkAsPaid = async (studentId: string, items: any[]) => {
    if (!window.confirm("Mark all outstanding items for this student as Paid?")) return;
    
    try {
        setLoading(true);
        const promises = items.map(item => 
            updateDoc(doc(db, 'shop_sales', item.id), { paymentStatus: 'paid' })
        );
        await Promise.all(promises);
        alert("Payment updated successfully.");
    } catch (e) {
        console.error(e);
        alert("Error updating payment.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">School Shop</h1>
        {!loading && (
          <div className="flex gap-3">
            <button onClick={() => setShowAddItem(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition"><Plus size={18}/> Add item</button>
            <button onClick={() => setShowStockAdj(true)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition">Stock adjustment</button>
            <button onClick={() => setShowNewSale(true)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition"><Plus size={18}/> New sale</button>
          </div>
        )}
      </div>
....
      {showAddItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-slate-100">
                <h3 className="font-bold text-xl text-slate-900 mb-6">Add New Item</h3>
                
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Item Name</label>
                <input type="text" placeholder="e.g. Notebook" value={newItem.name} onChange={e => { setNewItem({...newItem, name: e.target.value}); setErrors({...errors, name: ''}); }} className={`w-full px-4 py-2 bg-slate-50 border ${errors.name ? 'border-red-500' : 'border-slate-200'} rounded-lg`} />
                {errors.name && <p className="text-red-500 text-xs mb-4">{errors.name}</p>}
                
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                <select
                    value={showCustomCategory ? 'custom' : newItem.category}
                    onChange={e => {
                        setErrors({...errors, category: ''});
                        if (e.target.value === 'custom') {
                            setShowCustomCategory(true);
                            setNewItem({...newItem, category: ''});
                        } else {
                            setShowCustomCategory(false);
                            setNewItem({...newItem, category: e.target.value});
                        }
                    }}
                    className={`w-full px-4 py-2 bg-slate-50 border ${errors.category ? 'border-red-500' : 'border-slate-200'} rounded-lg`}
                >
                    <option value="">Select Category</option>
                    {Array.from(new Set(items.map(i => i.category))).filter(Boolean).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="Uniforms">Uniforms</option>
                    <option value="Stationery">Stationery</option>
                    <option value="Books">Books</option>
                    <option value="Canteen">Canteen</option>
                    <option value="Other">Other</option>
                    <option value="custom">+ Add New Category</option>
                </select>
                {errors.category && <p className="text-red-500 text-xs mb-4">{errors.category}</p>}
                {showCustomCategory && (
                    <input
                        type="text"
                        placeholder="Enter New Category"
                        value={newItem.category}
                        onChange={e => setNewItem({...newItem, category: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg mb-4"
                    />
                )}

                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sale Price (PKR)</label>
                <input type="number" placeholder="0" value={newItem.price} onChange={e => { setNewItem({...newItem, price: Number(e.target.value)}); setErrors({...errors, price: ''}); }} className={`w-full px-4 py-2 bg-slate-50 border ${errors.price ? 'border-red-500' : 'border-slate-200'} rounded-lg`} />
                {errors.price && <p className="text-red-500 text-xs mb-4">{errors.price}</p>}
                
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Buying Price (PKR)</label>
                <input type="number" placeholder="0" value={newItem.cost} onChange={e => { setNewItem({...newItem, cost: Number(e.target.value)}); setErrors({...errors, cost: ''}); }} className={`w-full px-4 py-2 bg-slate-50 border ${errors.cost ? 'border-red-500' : 'border-slate-200'} rounded-lg`} />
                {errors.cost && <p className="text-red-500 text-xs mb-4">{errors.cost}</p>}
                
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Initial Quantity (Stock)</label>
                <input type="number" placeholder="0" value={newItem.stock} onChange={e => { setNewItem({...newItem, stock: Number(e.target.value)}); setErrors({...errors, stock: ''}); }} className={`w-full px-4 py-2 bg-slate-50 border ${errors.stock ? 'border-red-500' : 'border-slate-200'} rounded-lg mb-6`} />
                {errors.stock && <p className="text-red-500 text-xs mb-6">{errors.stock}</p>}
                
                <div className="flex gap-3">
                    <button onClick={() => setShowAddItem(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition">Cancel</button>
                    <button onClick={handleAddItem} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition">Save Item</button>
                </div>
            </div>
        </div>
      )}

      {showNewSale && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-y-auto max-h-[90vh]">
                <h3 className="font-bold text-xl text-slate-900 mb-6">Process a New Sale</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Class</label>
                        <select value={newSale.studentClass} onChange={e => handleClassChange(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                            <option value="">Select Class</option>
                            {allAvailableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Student</label>
                        <select value={newSale.studentId} onChange={e => handleStudentChange(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                            <option value="">Select Student</option>
                            {students
                                .filter(s => {
                                    if (!newSale.studentClass) return false;
                                    const sClass = s.class?.toString().trim().toLowerCase() || "";
                                    const filterClass = newSale.studentClass.trim().toLowerCase();
                                    return sClass === filterClass || 
                                           sClass === `class ${filterClass}` || 
                                           `class ${sClass}` === filterClass ||
                                           sClass.replace(/\s+/g, '') === filterClass.replace(/\s+/g, '');
                                })
                                .map(s => <option key={s.id} value={s.id}>{s.name} {s.rollNumber ? `(${s.rollNumber})` : ''}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                        <select value={newSale.paymentStatus} onChange={e => setNewSale({...newSale, paymentStatus: e.target.value as 'paid' | 'unpaid'})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                        </select>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Father's Name</label>
                    <input disabled type="text" placeholder="Auto-populated" value={newSale.fatherName} className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg font-medium text-slate-700" />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                    <h4 className="font-bold text-sm text-slate-700 mb-4 uppercase tracking-wider">Add Items to Cart</h4>
                    <div className="flex gap-2 mb-4">
                        <select value={cartItem.itemId} onChange={e => setCartItem({...cartItem, itemId: e.target.value})} className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm">
                            <option value="">Select Item</option>
                            {items.map(i => <option key={i.id} value={i.id}>{i.name} (PKR {i.price})</option>)}
                        </select>
                        <input type="number" value={cartItem.quantity} onChange={e => setCartItem({...cartItem, quantity: Number(e.target.value)})} min="1" className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm" />
                        <button onClick={addToCart} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">+</button>
                    </div>

                    {cart.length > 0 && (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {cart.map(item => (
                                <div key={item.itemId} className="flex justify-between items-center bg-white p-2 border border-slate-100 rounded-lg text-sm shadow-sm">
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-800">{item.name}</p>
                                        <p className="text-xs text-slate-400">{item.quantity} x PKR {item.price}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="font-bold text-indigo-600">PKR {item.price * item.quantity}</p>
                                        <button onClick={() => removeFromCart(item.itemId)} className="text-red-500 hover:text-red-700">×</button>
                                    </div>
                                </div>
                            ))}
                            <div className="flex justify-between items-center pt-2 border-t font-bold text-slate-900 border-slate-200">
                                <span>Total Amount</span>
                                <span className="text-indigo-600">PKR {cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0)}</span>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="flex gap-3 mt-8">
                    <button onClick={() => { setShowNewSale(false); setCart([]); }} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition">Cancel</button>
                    <button onClick={handleNewSale} disabled={loading || cart.length === 0} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50">
                        {loading ? 'Processing...' : 'Complete Sale'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {showStockAdj && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-xl w-full max-w-sm">
                <div className="flex justify-start items-center mb-4 gap-4">
                    <button onClick={() => setShowStockAdj(false)} className="text-slate-400 hover:text-slate-600 font-bold">X</button>
                    <h3 className="font-black text-lg">Stock Adjustment</h3>
                </div>
                <select value={stockAdj.itemId} onChange={e => setStockAdj({...stockAdj, itemId: e.target.value})} className="w-full p-2 border rounded mb-2">
                    <option value="">Select Item</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name} (Current: {i.stock})</option>)}
                </select>
                <input type="number" placeholder="Adjustment (+/-)" value={stockAdj.adjustment} onChange={e => setStockAdj({...stockAdj, adjustment: Number(e.target.value)})} className="w-full p-2 border rounded mb-4" />
                <button onClick={handleStockAdjustment} className="w-full bg-indigo-600 text-white p-2 rounded">Save Adjustment</button>
            </div>
        </div>
      )}

      {loading ? (
        <p>Loading shop data...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {stats.map(s => (
              <div key={s.name} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{s.name}</p>
                <p className="text-3xl font-bold text-slate-900 mb-0.5">{s.value}</p>
                <p className="text-xs text-slate-400">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-4 border-b mb-6">
            {['Overview', 'Inventory', 'Reports', 'Shop Settings'].map(tab => (
              <button key={tab} className={`pb-2 ${activeTab === tab ? 'border-b-2 border-indigo-600 font-bold' : 'text-slate-500'}`} onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            ))}
          </div>
          
          <div className="mt-6">
            {activeTab === 'Overview' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">Outstanding Dues Overview</h3>
                            <p className="text-sm text-slate-500">Summary of students with unpaid items</p>
                        </div>
                        <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                            <span className="text-xs font-bold text-red-600 uppercase tracking-wider block">Total Outstanding</span>
                            <span className="text-xl font-black text-red-700">PKR {unpaidSalesTotal.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    {unpaidByStudent.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="text-slate-300" size={32} />
                            </div>
                            <h4 className="font-bold text-slate-900">No Outstanding Dues</h4>
                            <p className="text-slate-500">All student accounts are currently clear.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50">
                                    <tr className="text-slate-500">
                                        <th className="p-4 text-xs font-semibold uppercase tracking-wider">Student & Father Name</th>
                                        <th className="p-4 text-xs font-semibold uppercase tracking-wider">Class</th>
                                        <th className="p-4 text-xs font-semibold uppercase tracking-wider">Last Purchase</th>
                                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-right">Total Due</th>
                                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {unpaidByStudent.map((student: any) => (
                                        <tr key={student.studentId || student.name} className="hover:bg-slate-50 transition">
                                            <td className="p-4">
                                                <p className="font-bold text-slate-900">{student.name}</p>
                                                <p className="text-sm text-slate-500">{student.fatherName}</p>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold uppercase tracking-wider">
                                                    {student.studentClass}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-slate-600">
                                                {student.lastSaleDate}
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="text-lg font-bold text-red-600">PKR {student.totalDue.toLocaleString()}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center gap-2">
                                                    <button 
                                                        onClick={() => printBill(student)}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100 shadow-sm"
                                                        title="Print Bill"
                                                    >
                                                        <FileText size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            const itemNames = student.items.map((i: any) => i.itemName).join(', ');
                                                            openWhatsApp(student.studentId, itemNames, student.totalDue);
                                                        }} 
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100 shadow-sm"
                                                        title="Send WhatsApp Reminder"
                                                    >
                                                        <svg className="w-5 h-5 fill-emerald-600" viewBox="0 0 24 24">
                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03c0 2.122.554 4.197 1.607 6.013L0 24l6.135-1.61a11.77 11.77 0 005.911 1.586h.005c6.638 0 12.034-5.395 12.036-12.032a11.751 11.751 0 00-3.53-8.508z"/>
                                                        </svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleMarkAsPaid(student.studentId, student.items)}
                                                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-100 shadow-sm"
                                                        title="Mark as Paid"
                                                    >
                                                        <Database size={18} />
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
              </div>
            )}
            {activeTab === 'Inventory' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center p-6 border-b border-slate-100">
                        <h3 className="font-bold text-lg text-slate-900">Inventory List</h3>
                        <div className="flex gap-2">
                             <input type="text" placeholder="Filter by name..." value={filterName} onChange={e => setFilterName(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"/>
                             <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                                <option value="">All Categories</option>
                                <option value="Uniforms">Uniforms</option>
                                <option value="Stationery">Stationery</option>
                                <option value="Books">Books</option>
                                <option value="Canteen">Canteen</option>
                                <option value="Other">Other</option>
                             </select>
                        </div>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-slate-50">
                            <tr className="text-slate-500">
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => { setSortField('name'); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }}>Name {sortField === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => { setSortField('category'); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }}>Category {sortField === 'category' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider">Price</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider">Cost</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider">Profit/Unit</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => { setSortField('stock'); setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }}>Stock {sortField === 'stock' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items
                                .filter(item => item.name.toLowerCase().includes(filterName.toLowerCase()) && (filterCategory === '' || item.category === filterCategory))
                                .sort((a, b) => {
                                    const valA = a[sortField];
                                    const valB = b[sortField];
                                    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                                    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                                    return 0;
                                })
                                .map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition">
                                    <td className="p-4 text-sm text-slate-800 font-medium">{item.name}</td>
                                    <td className="p-4 text-sm text-slate-600">{item.category}</td>
                                    <td className="p-4 text-sm text-slate-600">PKR {item.price}</td>
                                    <td className="p-4 text-sm text-slate-600">PKR {item.cost}</td>
                                    <td className="p-4 text-sm text-slate-600">PKR {item.price - item.cost}</td>
                                    <td className="p-4 text-sm text-slate-800 font-semibold">{item.stock}</td>
                                    <td className="p-4 text-sm">
                                        <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition" title="Delete Item">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {activeTab === 'Reports' && (
                <div className="bg-white p-6 rounded-xl border">
                    <h3 className="font-black text-lg mb-4">Sales Report</h3>
                     <table className="w-full text-left">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2">Item</th>
                                <th className="p-2">Quantity</th>
                                <th className="p-2">Amount</th>
                                <th className="p-2">Student Name</th>
                                <th className="p-2">Father Name</th>
                                <th className="p-2">Class</th>
                                <th className="p-2">Status</th>
                                <th className="p-2">Action</th>
                                <th className="p-2">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.map(s => (
                                <tr key={s.id} className="border-b">
                                    <td className="p-2">{s.itemName}</td>
                                    <td className="p-2">{s.quantity}</td>
                                    <td className="p-2">PKR {s.totalAmount}</td>
                                    <td className="p-2">{s.studentName}</td>
                                    <td className="p-2">{s.fatherName}</td>
                                    <td className="p-2">{s.studentClass}</td>
                                    <td className="p-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {s.paymentStatus || 'unpaid'}
                                        </span>
                                    </td>
                                    <td className="p-2">
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => printBill({
                                                    name: s.studentName,
                                                    fatherName: s.fatherName,
                                                    studentClass: s.studentClass,
                                                    totalDue: s.totalAmount,
                                                    items: [s]
                                                })}
                                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100 shadow-sm"
                                                title="Print Receipt"
                                            >
                                                <FileText size={16} />
                                            </button>
                                            <button 
                                                onClick={() => openWhatsApp(s.studentId, s.itemName, s.totalAmount)} 
                                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center justify-center border border-emerald-100 shadow-sm"
                                                title="Send Receipt via WhatsApp"
                                            >
                                                <svg className="w-5 h-5 fill-emerald-600" viewBox="0 0 24 24">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03c0 2.122.554 4.197 1.607 6.013L0 24l6.135-1.61a11.77 11.77 0 005.911 1.586h.005c6.638 0 12.034-5.395 12.036-12.032a11.751 11.751 0 00-3.53-8.508z"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-2">{s.saleDate}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {activeTab === 'Shop Settings' && (
                <div className="bg-white p-6 rounded-xl border max-w-sm">
                    <h3 className="font-black text-lg mb-4">Shop Settings</h3>
                    <p className="text-sm text-slate-500 mb-4">Here you can configure your shop's basic details.</p>
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Shop Name</label>
                        <input type="text" placeholder="e.g., Main Campus Shop" className="w-full p-2 border rounded" />
                    </div>
                     <div className="mb-4">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Shop Manager</label>
                        <input type="text" placeholder="e.g., Mr. Smith" className="w-full p-2 border rounded" />
                    </div>
                    <button className="w-full bg-indigo-600 text-white p-2 rounded">Save Settings</button>
                    <p className="mt-4 text-xs text-slate-400">Settings will be saved to your campus profile.</p>
                </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
