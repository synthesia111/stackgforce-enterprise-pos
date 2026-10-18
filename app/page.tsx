"use client";
import { useState, useEffect } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
// 🔴 เพิ่ม onSnapshot สำหรับดึงข้อมูลเวลาแบบ Realtime
import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, onSnapshot } from "firebase/firestore";

// 🔴 1. Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCBLjDcA1NOKTmNyOZA61QhG7NvqpUbfhk",
  authDomain: "g-force-94ebf.firebaseapp.com",
  databaseURL: "https://g-force-94ebf-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "g-force-94ebf",
  storageBucket: "g-force-94ebf.firebasestorage.app",
  messagingSenderId: "432235790863",
  appId: "1:432235790863:web:f4a05da9b5ebde87a9997a",
  measurementId: "G-HCP6DSZXDR"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// 🔴 2. ตั้งค่า Webhook Discord
const clockWebhookUrl = "https://discord.com/api/webhooks/1561125347963961496/ca2pwZjHMZ5-jJBQi5alHKtDaLfEhkmIntnuLohCkLZzzhJEasXEhEEH8LjT7LbcN6Mf"; 
const salesWebhookUrl = "https://discord.com/api/webhooks/1561154537849487430/a1811-QSjMxaHnmO0DZ3KP5kq5iVF2E3pJ_5j2-tE-xA_AqCICo467PM875e5eg7eS3Q"; 

const branchList = ["Grip Bar", "Yozakaya", "K-Kart Speedway", "Advance Performance"];
const branchDetails = [
  { id: "grip-bar", name: "Grip Bar", icon: "🍸", desc: "Premium Nightclub & Bar" },
  { id: "yozakaya", name: "Yozakaya", icon: "🍣", desc: "Authentic Japanese Restaurant" },
  { id: "k-kart", name: "K-Kart Speedway", icon: "🏎️", desc: "Professional Go-Kart Track" },
  { id: "advance", name: "Advance Performance", icon: "🔧", desc: "High-Performance Tuning" }
];

// เพิ่มเมนู GoKart 30 นาที เป็นค่าเริ่มต้น
const defaultMenus = [
  { name: "เช่า GoKart 10 นาที", price: 500, img: "https://placehold.co/400x300/111/FFF?text=Kart+10m", branch: "K-Kart Speedway" },
  { name: "เช่า GoKart 20 นาที", price: 900, img: "https://placehold.co/400x300/111/FFF?text=Kart+20m", branch: "K-Kart Speedway" },
  { name: "เช่า GoKart 30 นาที", price: 1200, img: "https://placehold.co/400x300/111/FFF?text=Kart+30m", branch: "K-Kart Speedway" },
  { name: "Signature Cocktail", price: 280, img: "https://placehold.co/400x300/111/FFF?text=Cocktail", branch: "Grip Bar" },
  { name: "Salmon Sashimi", price: 350, img: "https://placehold.co/400x300/111/FFF?text=Sashimi", branch: "Yozakaya" },
  { name: "Remap ECU", price: 12000, img: "https://placehold.co/400x300/111/FFF?text=ECU+Remap", branch: "Advance Performance" },
];

export default function GForceApp() {
  const [view, setView] = useState<"login" | "register" | "select-org" | "menu" | "owner-dashboard">("login");
  const [loginStep, setLoginStep] = useState<"landing" | "profiles" | "pin">("landing");
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeBranch, setActiveBranch] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [publicStaffList, setPublicStaffList] = useState<any[]>([]);
  const [loginSearch, setLoginSearch] = useState("");
  const [selectedLoginUser, setSelectedLoginUser] = useState<any>(null);
  const [pin, setPin] = useState("");

  const [regName, setRegName] = useState("");
  const [regPin, setRegPin] = useState("");
  const [regPhone, setRegPhone] = useState("");

  const [cart, setCart] = useState<any[]>([]);
  const [dbMenus, setDbMenus] = useState<any[]>([]);
  const currentMenus = dbMenus.filter(m => m.branch === activeBranch);

  const [customerSearchPhone, setCustomerSearchPhone] = useState("");
  const [currentCustomer, setCurrentCustomer] = useState<any>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [redeemPoints, setRedeemPoints] = useState<number>(0);

  const [ownerTab, setOwnerTab] = useState<"staff" | "sales" | "menu" | "customers">("sales");
  const [staffList, setStaffList] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [customerList, setCustomerList] = useState<any[]>([]);
  
  const [menuFilterBranch, setMenuFilterBranch] = useState<string>("all");
  const [editingMenu, setEditingMenu] = useState<any>(null);
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [newMenuData, setNewMenuData] = useState({ name: "", price: "", img: "", branch: branchList[0] });

  // 🔴 State สำหรับระบบ Live Track (GoKart)
  const [kartSessions, setKartSessions] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const isPartner = currentUser?.role === "partner";

  const fetchPublicStaff = async () => {
    try {
      const q = query(collection(db, "employees"), where("isApproved", "==", true));
      const snap = await getDocs(q);
      
      // 🔴 เติม : any[] ลงไปตรงบรรทัดนี้ครับ
      const staffs: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() })); 
      
      staffs.unshift({ id: "admin-system", icName: "Admin", role: "partner", isApproved: true });
      setPublicStaffList(staffs);
    } catch (error) { console.error(error); }
  };

  const fetchMenus = async () => {
    const snap = await getDocs(collection(db, "menus"));
    if (!snap.empty) setDbMenus(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    else setDbMenus([]);
  };

  useEffect(() => { fetchPublicStaff(); fetchMenus(); }, []);

  // 🔴 Timer Effect สำหรับนับเวลา Realtime
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 🔴 ดึงข้อมูลเซสชันรถ GoKart แบบ Realtime
  useEffect(() => {
    if (view === "menu" && activeBranch === "K-Kart Speedway") {
      const q = query(collection(db, "kart_sessions"), where("branch", "==", activeBranch));
      const unsub = onSnapshot(q, (snap) => {
        setKartSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }
  }, [view, activeBranch]);

  const formatTime = (dateObj: Date) => dateObj.toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + " น.";

  const sendToDiscord = async (message: string, webhookUrl: string) => {
    if (!webhookUrl) return;
    try { await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: message }) }); } 
    catch (error) {}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const safePin = pin.trim();
    if (!selectedLoginUser) return;

    if (selectedLoginUser.icName === "Admin" && safePin === "EbiKo") {
      setCurrentUser({ icName: "Executive (Admin)", role: "partner", allowedBranches: branchList, isApproved: true });
      setView("owner-dashboard"); fetchOwnerData(); return;
    }

    if (safePin.length !== 6) return alert("❌ กรุณากรอกรหัส PIN 6 หลักให้ถูกต้อง");
    setIsLoading(true);
    try {
      const q = query(collection(db, "employees"), where("icName", "==", selectedLoginUser.icName), where("pin", "==", safePin));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) { alert("❌ รหัส PIN ไม่ถูกต้อง"); setPin(""); } 
      else {
        const userData = querySnapshot.docs[0].data();
        userData.id = querySnapshot.docs[0].id;
        if (!userData.role) userData.role = "employee"; 
        setCurrentUser(userData); setView("select-org");
      }
    } catch (error) { alert("❌ เชื่อมต่อระบบล้มเหลว"); }
    setIsLoading(false);
  };

  const handleRegisterStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPin.length !== 6) return alert("รหัส PIN ต้องมี 6 หลัก");
    setIsLoading(true);
    try {
      const q = query(collection(db, "employees"), where("icName", "==", regName));
      if (!(await getDocs(q)).empty) return alert("❌ ข้อมูลซ้ำในระบบ");
      await addDoc(collection(db, "employees"), { 
        icName: regName, pin: regPin, phoneIC: regPhone, isApproved: false, role: "employee",
        allowedBranches: [], hourlyRate: 0, totalWorkMinutes: 0, registeredAt: serverTimestamp() 
      });
      alert("✅ ส่งคำขอลงทะเบียนสำเร็จ");
      setRegName(""); setRegPin(""); setRegPhone(""); setView("login"); setLoginStep("landing");
    } catch (error) { alert("❌ ลงทะเบียนไม่สำเร็จ"); }
    setIsLoading(false);
  };

  const handleClockIn = (branchName: string) => {
    setActiveBranch(branchName);
    const now = new Date();
    localStorage.setItem(`timeIn_${currentUser.icName}`, now.getTime().toString());
    sendToDiscord(`🟢 **เข้างาน (Clock In)**\n👤 พนักงาน: ${currentUser.icName}\n🏢 สาขา: ${branchName}\n⏰ เวลาเข้า: ${formatTime(now)}`, clockWebhookUrl);
    setView("menu");
  };

  const handleClockOut = async () => {
    const now = new Date();
    const savedTime = localStorage.getItem(`timeIn_${currentUser.icName}`);
    let durationMsg = "";
    if (savedTime) {
      const diffMins = Math.floor((now.getTime() - parseInt(savedTime)) / (1000 * 60));
      durationMsg = `\n⏱️ **เวลาทำงาน:** ${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
      localStorage.removeItem(`timeIn_${currentUser.icName}`);
      try {
        const newTotalMins = (currentUser.totalWorkMinutes || 0) + diffMins;
        if(currentUser.id) await updateDoc(doc(db, "employees", currentUser.id), { totalWorkMinutes: newTotalMins });
        setCurrentUser({...currentUser, totalWorkMinutes: newTotalMins}); 
      } catch (err) {}
    }
    sendToDiscord(`🔴 **ออกงาน (Clock Out)**\n👤 พนักงาน: ${currentUser.icName}\n🏢 สาขา: ${activeBranch}\n⏰ เวลาออก: ${formatTime(now)}${durationMsg}`, clockWebhookUrl);
    setCart([]); setCurrentCustomer(null); setCustomerSearchPhone(""); setRedeemPoints(0); setActiveBranch(""); setView("select-org");
  };

  const handleSearchCustomer = async () => {
    if (!customerSearchPhone) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, "customers"), where("phone", "==", customerSearchPhone));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("ไม่พบข้อมูลลูกค้าในระบบ");
        setNewCustomerPhone(customerSearchPhone); setCurrentCustomer(null); setRedeemPoints(0);
      } else {
        setCurrentCustomer({ id: snap.docs[0].id, ...snap.docs[0].data() }); setRedeemPoints(0); 
      }
    } catch (error) { alert("❌ เกิดข้อผิดพลาด"); }
    setIsLoading(false);
  };

  const handleRegisterCustomer = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true);
    try {
      const q = query(collection(db, "customers"), where("phone", "==", newCustomerPhone));
      if (!(await getDocs(q)).empty) return alert("⚠️ เบอร์นี้อยู่ในระบบแล้ว");
      const docRef = await addDoc(collection(db, "customers"), { name: newCustomerName, phone: newCustomerPhone, points: 0, registeredAt: serverTimestamp() });
      setCurrentCustomer({ id: docRef.id, name: newCustomerName, phone: newCustomerPhone, points: 0 });
      setShowRegisterModal(false); setNewCustomerName(""); setRedeemPoints(0);
    } catch (error) { alert("❌ ผิดพลาด"); }
    setIsLoading(false);
  };

  // 🔴 ปรับปรุงระบบเพิ่มลงตะกร้า (บังคับใส่เลขกุญแจถ้าระบุเวลา)
  const addToCart = (item: any) => {
    let keyId: string | null = null;
    let duration = 0;
    
    // ตรวจสอบว่ามีคำว่ากี่นาที
    if (item.name.includes("30 นาที")) duration = 30;
    else if (item.name.includes("20 นาที")) duration = 20;
    else if (item.name.includes("10 นาที")) duration = 10;

    if (duration > 0 && activeBranch === "K-Kart Speedway") {
      keyId = prompt(`ระบุหมายเลขกุญแจรถ (Key ID) สำหรับ ${item.name}:`);
      if (!keyId) return; // หากกดยกเลิก จะไม่หยิบลงตะกร้า
    }

    setCart(prev => {
      // ถ้ารถมีรหัสกุญแจ ให้แยกบิลออกเป็นบรรทัดใครบรรทัดมัน
      if (keyId) {
        return [...prev, { ...item, cartId: Date.now() + Math.random(), qty: 1, keyId, duration }];
      }
      // ถ้าเป็นสินค้าปกติ ให้บวกจำนวน qty เพิ่มได้
      const existing = prev.find(i => i.id === item.id && !i.keyId);
      if (existing) {
        return prev.map(i => (i.id === item.id && !i.keyId) ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, cartId: Date.now() + Math.random(), qty: 1 }];
    });
  };

  // 🔴 ปรับการลบสินค้าออกให้ลบตรงเป๊ะตาม cartId
  const removeFromCart = (cartId: number) => setCart(prev => prev.filter(i => i.cartId !== cartId));
  
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const finalTotalAmount = Math.max(0, cartSubtotal - redeemPoints); 

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (currentCustomer && redeemPoints > currentCustomer.points) return alert("⚠️ พอยต์สะสมไม่เพียงพอ");
    setIsLoading(true);
    try {
      const earnedPoints = Math.floor(finalTotalAmount / 10000);
      let customerInfo = "Walk-in";
      if (currentCustomer) {
        const newPoints = currentCustomer.points - redeemPoints + earnedPoints;
        await updateDoc(doc(db, "customers", currentCustomer.id), { points: newPoints });
        customerInfo = `${currentCustomer.name} (ใช้ ${redeemPoints} pt | ได้รับ ${earnedPoints} pt | คงเหลือ ${newPoints} pt)`;
      }

      await addDoc(collection(db, "orders"), {
        branch: activeBranch, cashier: currentUser.icName, customerName: currentCustomer ? currentCustomer.name : "Walk-in",
        items: cart, subTotal: cartSubtotal, discount: redeemPoints, totalAmount: finalTotalAmount, earnedPoints, usedPoints: redeemPoints,
        timestamp: serverTimestamp(), isCleared: false 
      });

      // 🔴 สร้างตัวนับเวลา (Timer) เข้าฐานข้อมูลสำหรับรายการที่เป็นรถโกคาร์ท
      const kartItems = cart.filter(i => i.keyId);
      for (const kItem of kartItems) {
        await addDoc(collection(db, "kart_sessions"), {
          keyId: kItem.keyId,
          durationMins: kItem.duration,
          startTime: Date.now(),
          branch: activeBranch,
          customerName: currentCustomer ? currentCustomer.name : "Walk-in"
        });
      }

      let orderDetails = cart.map(i => `- ${i.name} x${i.qty} (${(i.price * i.qty).toLocaleString()} ฿)`).join('\n');
      let discountMsg = redeemPoints > 0 ? `\n🎁 **ส่วนลด Reward:** -${redeemPoints} ฿` : "";
      sendToDiscord(`💰 **New Transaction**\n🏢 สาขา: ${activeBranch}\n👤 แคชเชียร์: ${currentUser.icName}\n👑 ลูกค้า: ${customerInfo}\n\n**รายการ:**\n${orderDetails}${discountMsg}\n\n💵 **ยอดสุทธิ (Net Total): ${finalTotalAmount.toLocaleString()} ฿**`, salesWebhookUrl);
      
      alert(`✅ ทำรายการสำเร็จ\nยอดชำระสุทธิ: ${finalTotalAmount.toLocaleString()} THB`);
      setCart([]); setCurrentCustomer(null); setCustomerSearchPhone(""); setRedeemPoints(0);
    } catch (error) { alert("❌ ทำรายการไม่สำเร็จ"); }
    setIsLoading(false);
  };

  const fetchOwnerData = async () => {
    const staffSnap = await getDocs(collection(db, "employees"));
    setStaffList(staffSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    const salesSnap = await getDocs(query(collection(db, "orders"), where("isCleared", "==", false)));
    setSalesData(salesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    const custSnap = await getDocs(collection(db, "customers"));
    const sortedCustomers = custSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.points || 0) - (a.points || 0));
    setCustomerList(sortedCustomers);
    fetchMenus();
  };

  const handleUpdateRole = async (empId: string, newRole: string) => { if (!isPartner) return; await updateDoc(doc(db, "employees", empId), { role: newRole }); fetchOwnerData(); };
  const handleDeleteEmployee = async (empId: string, name: string) => { if (!isPartner) return; if (!confirm(`ยืนยันการลบ ${name} ออกจากระบบ?`)) return; await deleteDoc(doc(db, "employees", empId)); fetchOwnerData(); };
  const handleToggleApprove = async (empId: string, currentStatus: boolean) => { if (!isPartner) return; await updateDoc(doc(db, "employees", empId), { isApproved: !currentStatus }); fetchOwnerData(); };
  const handleBranchToggle = async (empId: string, currentBranches: string[], branch: string) => { if (!isPartner) return; const updated = currentBranches.includes(branch) ? currentBranches.filter(b => b !== branch) : [...currentBranches, branch]; await updateDoc(doc(db, "employees", empId), { allowedBranches: updated }); fetchOwnerData(); };
  const handleUpdateHourlyRate = async (empId: string, currentRate: number) => { if (!isPartner) return; const newRate = prompt("เรทค่าตอบแทน (บาท/ชม.):", (currentRate || 0).toString()); if (newRate && !isNaN(Number(newRate))) { await updateDoc(doc(db, "employees", empId), { hourlyRate: Number(newRate) }); fetchOwnerData(); } };
  const handlePayCompensation = async (empId: string, icName: string, totalPay: number) => { if (!isPartner) return; if (!confirm(`ยืนยันการจ่ายค่าตอบแทน ฿${totalPay.toLocaleString()} ให้ ${icName} และรีเซ็ตเวลา/ยอดขาย?`)) return; setIsLoading(true); try { await updateDoc(doc(db, "employees", empId), { totalWorkMinutes: 0 }); const toClear = salesData.filter(s => s.cashier === icName); for (const order of toClear) { await updateDoc(doc(db, "orders", order.id), { isCleared: true }); } fetchOwnerData(); } catch (error) { alert("Error"); } setIsLoading(false); };
  const handleClearSales = async (branchFilter: string) => { if (!isPartner) return; if (!confirm(`เคลียร์ยอดค้างรับของ ${branchFilter === 'all' ? 'ทุกสาขา' : branchFilter}?`)) return; setIsLoading(true); const toClear = branchFilter === 'all' ? salesData : salesData.filter(s => s.branch === branchFilter); for (const order of toClear) { await updateDoc(doc(db, "orders", order.id), { isCleared: true }); } fetchOwnerData(); setIsLoading(false); };
  const handleUpdateCustomerPoints = async (custId: string, currentPoints: number, name: string) => { if (!isPartner) return; const newPoints = prompt(`ปรับคะแนนลูกค้า: ${name}:`, currentPoints.toString()); if (newPoints && !isNaN(Number(newPoints))) { await updateDoc(doc(db, "customers", custId), { points: Number(newPoints) }); fetchOwnerData(); } };
  const handleAddNewMenu = async (e: React.FormEvent) => { e.preventDefault(); if (!isPartner) return; setIsLoading(true); try { await addDoc(collection(db, "menus"), { name: newMenuData.name, price: Number(newMenuData.price), img: newMenuData.img, branch: newMenuData.branch }); setShowAddMenuModal(false); setNewMenuData({ name: "", price: "", img: "", branch: branchList[0] }); fetchOwnerData(); } catch (error) {} setIsLoading(false); };
  const handleDeleteMenu = async (menuId: string, menuName: string) => { if (!isPartner) return; if (!confirm(`ลบเมนู: ${menuName}?`)) return; await deleteDoc(doc(db, "menus", menuId)); fetchOwnerData(); };
  const handleSaveMenuData = async (e: React.FormEvent) => { e.preventDefault(); setIsLoading(true); try { await updateDoc(doc(db, "menus", editingMenu.id), { name: editingMenu.name, price: Number(editingMenu.price), img: editingMenu.img }); setEditingMenu(null); fetchOwnerData(); } catch (error) {} setIsLoading(false); };

  const TopNav = ({ title, subtitle, onBack, rightEl }: any) => (
    <div className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 px-8 py-5 flex justify-between items-center shadow-sm">
      <div className="flex items-center space-x-6">
        {onBack && <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors uppercase tracking-wider text-xs font-bold">← กลับ (Back)</button>}
        <div>
          <h1 className="text-xl font-bold tracking-widest text-white uppercase">{title}</h1>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5 tracking-wider uppercase">{subtitle}</p>
        </div>
      </div>
      {rightEl}
    </div>
  );

  // ==========================================
  // VIEW: LOGIN
  // ==========================================
  if (view === "login" || view === "register") {
    const filteredStaff = publicStaffList.filter(s => s.icName.toLowerCase().includes(loginSearch.toLowerCase()));

    return (
      <div className="min-h-screen flex flex-col relative font-sans overflow-hidden bg-[#050505]">
        
        {/* โลโก้พื้นหลังคมชัด ไม่จมฟิลเตอร์ */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <div 
            className="w-full max-w-4xl h-full bg-contain bg-center bg-no-repeat transition-transform duration-[20s] hover:scale-105 opacity-90"
            style={{ backgroundImage: "url('https://r2.fivemanage.com/e5aaq009RlhjsUidt8Cla/Gemini_Generated_Image_l865j7l865j7l865.jfif')" }}
          ></div>
        </div>
        
        {/* ขอบมืด (Vignette) เพื่อให้ขอบจอและตัวหนังสือเด่น แต่ตรงกลางใสเพื่อให้เห็นโลโก้ */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#050505_80%)] pointer-events-none"></div>

        {/* 1. หน้า Landing */}
        {view === "login" && loginStep === "landing" && (
          <div className="relative z-10 flex flex-col min-h-screen p-6 animate-fade-in pb-16 pt-10">
            <div className="flex-1 flex flex-col items-center"></div>

            {/* 4 กิจการ */}
            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 mt-auto z-20">
              {branchDetails.map((branch) => (
                <div 
                  key={branch.id} 
                  onClick={() => setLoginStep("profiles")} 
                  className="cursor-pointer border border-white/10 bg-black/60 backdrop-blur-xl p-6 rounded-2xl flex flex-col items-center justify-center hover:bg-white/10 hover:border-white/30 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-all group"
                >
                  <div className="text-4xl mb-4 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">{branch.icon}</div>
                  <p className="text-base md:text-lg font-bold text-white tracking-wide mb-1 text-center">{branch.name}</p>
                  <p className="text-[10px] text-gray-400 tracking-widest uppercase text-center">{branch.desc}</p>
                </div>
              ))}
            </div>

            {/* ลิ้งก์สมัครงาน */}
            <div className="w-full flex justify-center mt-10 z-20">
              <button onClick={() => setView("register")} className="text-gray-300 hover:text-white text-[10px] tracking-widest transition-colors flex items-center space-x-2 bg-black/80 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/10 hover:border-white/30">
                <span>พนักงานใหม่? (New Staff?)</span>
                <span className="text-white font-bold">ลงทะเบียนที่นี่</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. หน้าต่างเลือกโปรไฟล์ */}
        {view === "login" && loginStep === "profiles" && (
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in">
            <div className="w-full max-w-3xl bg-[#0a0505]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
              <button onClick={() => setLoginStep("landing")} className="absolute top-8 right-8 text-gray-400 hover:text-white text-xs uppercase tracking-wider">✕ ปิด (Close)</button>
              
              <div className="mb-8">
                <p className="text-[10px] text-gray-400 tracking-widest mb-2 uppercase">ระบบจัดการสิทธิ์ (Access Control)</p>
                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">เลือกโปรไฟล์ของคุณ</h2>
              </div>

              <div className="bg-black/50 border border-white/10 rounded-xl p-3 mb-6 flex items-center">
                <span className="text-gray-500 ml-2 mr-3">🔍</span>
                <input value={loginSearch} onChange={e => setLoginSearch(e.target.value)} className="bg-transparent w-full text-white outline-none text-sm placeholder-gray-600" placeholder="ค้นหาชื่อพนักงาน (Search staff...)" />
                <span className="text-[10px] text-gray-500 ml-2 whitespace-nowrap">{filteredStaff.length} คน</span>
              </div>

              <div className="max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                  {filteredStaff.map((staff) => (
                    <div key={staff.id} onClick={() => { setSelectedLoginUser(staff); setLoginStep("pin"); }} className="bg-[#111] border border-white/5 hover:border-white/30 rounded-xl p-4 flex items-center cursor-pointer transition-all hover:bg-white/10 group">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white mr-4 shadow-inner bg-gradient-to-br from-neutral-700 to-black border border-white/10">
                        {staff.icName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate flex-1">
                        <p className="text-sm font-medium text-gray-200 group-hover:text-white truncate">{staff.icName}</p>
                      </div>
                    </div>
                  ))}
                  {filteredStaff.length === 0 && <div className="col-span-full text-center py-10 text-gray-500 text-sm border border-dashed border-white/10 rounded-xl">ไม่พบรายชื่อ (No Staff Found)</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. หน้าต่างกรอก PIN */}
        {view === "login" && loginStep === "pin" && selectedLoginUser && (
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in">
            <div className="w-full max-w-md bg-[#0a0505]/90 backdrop-blur-2xl border border-white/10 p-10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] relative text-center">
              <button onClick={() => { setLoginStep("profiles"); setPin(""); }} className="absolute top-8 left-8 text-gray-400 hover:text-white text-xs uppercase tracking-wider">← กลับ (Back)</button>
              
              <div className="w-20 h-20 bg-gradient-to-br from-neutral-800 to-black border border-white/20 rounded-full mx-auto mb-4 mt-4 flex items-center justify-center shadow-lg">
                <span className="text-2xl text-white font-bold">{selectedLoginUser.icName.substring(0, 2).toUpperCase()}</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-8 tracking-wide">{selectedLoginUser.icName}</h2>
              
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <input type="password" required autoFocus value={pin} onChange={e=>setPin(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-white text-center tracking-[1em] text-2xl focus:border-white/50 outline-none transition-all placeholder:text-gray-700 shadow-inner" placeholder="••••••" />
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-white hover:bg-gray-200 text-black font-black py-4 rounded-xl transition-all tracking-widest text-xs uppercase active:scale-95">
                  {isLoading ? "Authenticating..." : "เข้าสู่ระบบ (Login)"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* หน้าสมัครพนักงานใหม่ */}
        {view === "register" && (
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in">
            <div className="w-full max-w-md bg-[#0a0505]/90 backdrop-blur-2xl border border-white/10 p-10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <p className="text-[10px] text-gray-400 tracking-widest mb-1 uppercase">G-Force · Recruitment</p>
                  <h2 className="text-xl font-bold text-white tracking-tight">ลงทะเบียนพนักงานใหม่</h2>
                </div>
                <button onClick={()=>{setView("login"); setLoginStep("landing");}} className="text-gray-400 hover:text-white text-xs uppercase tracking-wider">กลับ (Back)</button>
              </div>
              <form onSubmit={handleRegisterStaff} className="space-y-4">
                <input required value={regName} onChange={e=>setRegName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-white/30 placeholder:text-gray-600 text-sm" placeholder="ชื่อ-นามสกุล (IC Name)" />
                <input required value={regPhone} onChange={e=>setRegPhone(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-white/30 placeholder:text-gray-600 text-sm" placeholder="เบอร์โทรศัพท์ติดต่อ (Phone)" />
                <input type="password" required maxLength={6} value={regPin} onChange={e=>setRegPin(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-white text-center tracking-[0.5em] outline-none focus:border-white/30 placeholder:text-gray-600 text-sm" placeholder="ตั้งรหัส PIN 6 หลัก" />
                <button type="submit" disabled={isLoading} className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 rounded-xl transition-all tracking-widest text-xs uppercase mt-6 shadow-lg active:scale-95">ส่งข้อมูลลงทะเบียน (Submit)</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: SELECT ORG
  // ==========================================
  if (view === "select-org") {
    return (
      <div className="min-h-screen font-sans flex flex-col relative bg-[#050505]">
        <TopNav title="G-FORCE PORTAL" subtitle={`ผู้ใช้งาน: ${currentUser?.icName}`} rightEl={<button onClick={() => { setView("login"); setLoginStep("landing"); setPin(""); setSelectedLoginUser(null); }} className="text-gray-400 hover:text-white text-[10px] font-bold uppercase tracking-wider border border-white/10 px-4 py-1.5 rounded-full">ลงชื่อออก (Sign Out)</button>} />
        
        <div className="max-w-6xl mx-auto w-full p-8 mt-6">
          <p className="text-gray-500 text-xs tracking-[0.2em] uppercase mb-6">เลือกสาขาที่เข้าปฏิบัติงาน (Select Operations Facility)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {branchDetails.map((branch) => {
              const hasAccess = ["partner", "manager"].includes(currentUser?.role) || (currentUser?.allowedBranches && currentUser.allowedBranches.includes(branch.name));
              return (
                <div key={branch.id} className={`p-8 rounded-2xl border transition-all duration-300 ${hasAccess ? "bg-[#0a0a0a] border-white/10 hover:border-white/30 cursor-pointer group hover:-translate-y-1 shadow-xl" : "bg-[#050505] border-white/5 opacity-50 cursor-not-allowed"}`} onClick={() => { if (hasAccess) handleClockIn(branch.name); }}>
                  <div className="flex items-center space-x-6"><div className="text-4xl opacity-80 group-hover:opacity-100 transition-opacity">{branch.icon}</div><div className="flex-1"><h3 className="text-xl font-bold text-white mb-1 tracking-tight">{branch.name}</h3><p className="text-gray-500 text-xs">{hasAccess ? branch.desc : "ไม่มีสิทธิ์เข้าถึง (Restricted)"}</p></div></div>
                </div>
              )
            })}
          </div>

          {["partner", "manager"].includes(currentUser?.role) && (
            <div className="mt-12">
              <button onClick={() => { setView("owner-dashboard"); fetchOwnerData(); }} className="w-full bg-[#0a0a0a] border border-white/10 hover:border-white/30 hover:bg-[#111] text-white font-bold py-6 rounded-2xl transition-all flex items-center justify-center space-x-3 group">
                <span className="text-xl">⚙️</span><span className="tracking-widest uppercase text-sm">เข้าสู่กระดานผู้บริหาร (Executive Dashboard)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: OWNER DASHBOARD
  // ==========================================
  if (view === "owner-dashboard") {
    return (
      <div className="min-h-screen text-white font-sans bg-[#050505]">
        <TopNav title="Executive Dashboard" subtitle={`ระดับสิทธิ์: ${isPartner ? "Partner" : "Manager"}`} onBack={() => { setView("select-org"); fetchMenus(); }} />
        <div className="max-w-[1400px] mx-auto p-8">
          <div className="flex space-x-6 mb-10 border-b border-white/10 pb-1">
            {[ { id: "sales", label: "ยอดขาย (Financials)" }, { id: "staff", label: "พนักงาน (Personnel)" }, { id: "menu", label: "สินค้า (Inventory)" }, { id: "customers", label: "ลูกค้า (CRM)" } ].map(tab => (
              <button key={tab.id} onClick={()=>setOwnerTab(tab.id as any)} className={`pb-4 text-xs tracking-widest uppercase font-bold transition-all ${ownerTab === tab.id ? "text-white border-b-2 border-white" : "text-gray-500 hover:text-white"}`}>{tab.label}</button>
            ))}
          </div>

          <div className="animate-fade-in">
            {/* TAB SALES */}
            {ownerTab === "sales" && (
              <div className="space-y-8">
                <div className="bg-[#0a0a0a] border border-white/10 p-10 rounded-2xl flex flex-col md:flex-row justify-between items-center relative overflow-hidden shadow-2xl">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full"></div>
                  <div className="relative z-10"><p className="text-gray-400 text-xs tracking-[0.2em] uppercase mb-3">รายได้รวมระดับองค์กร (Enterprise Total Revenue)</p><p className="text-5xl md:text-7xl font-light text-white tracking-tighter">฿{salesData.reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString()}</p></div>
                  <div className="text-right mt-6 md:mt-0 relative z-10">{isPartner && <button onClick={()=>handleClearSales('all')} className="bg-white text-black hover:bg-gray-200 px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-wider transition-all">ตัดยอดทุกสาขา (Settle All)</button>}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {branchList.map(b => {
                    const branchSales = salesData.filter(s => s.branch === b);
                    const total = branchSales.reduce((sum, s) => sum + s.totalAmount, 0);
                    return (
                      <div key={b} className="bg-[#0a0a0a] p-6 rounded-2xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-all">
                        <div><p className="text-gray-400 text-xs uppercase tracking-wider mb-4">{b}</p><p className="text-3xl font-light text-white tracking-tight">฿{total.toLocaleString()}</p><p className="text-[10px] text-gray-500 mt-2 tracking-widest">{branchSales.length} รายการ (Transactions)</p></div>
                        {isPartner && <button onClick={()=>handleClearSales(b)} disabled={total===0} className="mt-8 text-xs text-gray-500 hover:text-white disabled:opacity-20 font-medium transition-all text-left uppercase tracking-wider">→ ตัดยอดสาขานี้ (Settle)</button>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TAB STAFF */}
            {ownerTab === "staff" && (
              <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-8 overflow-x-auto">
                {!isPartner && <div className="mb-6 p-4 bg-white/5 border border-white/10 text-gray-300 text-xs rounded-xl">ℹ️ สิทธิ์ Manager: ดูข้อมูลได้อย่างเดียว (Read-only access)</div>}
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="text-gray-500 uppercase tracking-widest text-[10px] border-b border-white/10">
                    <tr><th className="pb-4 pr-4 font-normal">ชื่อ (Identity)</th><th className="pb-4 pr-4 font-normal">ตำแหน่ง (Role)</th><th className="pb-4 pr-4 font-normal">สิทธิ์ (Permissions)</th><th className="pb-4 pr-4 font-normal text-right">ยอดขาย (Revenue)</th><th className="pb-4 pr-4 font-normal text-right">เวลาทำงาน (Hours)</th><th className="pb-4 font-normal text-right">ค่าตอบแทน (Compensation)</th>{isPartner && <th className="pb-4 font-normal text-center">จัดการ (Action)</th>}</tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {staffList.map(emp => {
                      const empSales = salesData.filter(s => s.cashier === emp.icName).reduce((sum, s) => sum + s.totalAmount, 0);
                      const totalMins = emp.totalWorkMinutes || 0;
                      const hrs = Math.floor(totalMins / 60);
                      const mins = totalMins % 60;
                      const hourlyRate = emp.hourlyRate || 0;
                      const totalPay = (totalMins / 60) * hourlyRate;
                      return (
                        <tr key={emp.id} className="hover:bg-white/[0.02]">
                          <td className="py-6 pr-4"><p className="font-bold text-white text-sm">{emp.icName}</p><p className="text-gray-500 text-xs mt-1">{emp.phoneIC}</p></td>
                          <td className="py-6 pr-4"><select value={emp.role || "employee"} onChange={(e) => handleUpdateRole(emp.id, e.target.value)} disabled={!isPartner} className="bg-transparent border-b border-white/20 text-xs py-1 outline-none text-gray-300 focus:border-white w-24"><option value="employee">Employee</option><option value="manager">Manager</option><option value="partner">Partner</option></select></td>
                          <td className="py-6 pr-4">
                            <div className="flex items-center space-x-3 mb-3"><div className={`w-2 h-2 rounded-full ${emp.isApproved ? "bg-white" : "bg-red-500"}`}></div><button onClick={()=>handleToggleApprove(emp.id, emp.isApproved)} disabled={!isPartner} className="text-[10px] text-gray-400 hover:text-white transition-colors">{emp.isApproved?"อนุมัติแล้ว (Approved)":"รออนุมัติ (Pending)"}</button></div>
                            <div className="flex flex-wrap gap-2 max-w-[200px]">{branchList.map(b => (<label key={b} className={`flex items-center space-x-1.5 opacity-${(emp.allowedBranches||[]).includes(b)?'100':'40'} ${isPartner ? "cursor-pointer" : ""}`}><input type="checkbox" checked={(emp.allowedBranches||[]).includes(b)} onChange={()=>handleBranchToggle(emp.id, emp.allowedBranches||[], b)} disabled={!isPartner} className="hidden" /><span className="text-[10px] uppercase tracking-wider text-white border border-white/20 px-2 py-0.5 rounded-sm">{b.split(' ')[0]}</span></label>))}</div>
                          </td>
                          <td className="py-6 pr-4 text-right font-medium text-white">{empSales > 0 ? `฿${empSales.toLocaleString()}` : "-"}</td>
                          <td className="py-6 pr-4 text-right text-white">{hrs}h {mins}m</td>
                          <td className="py-6 text-right"><div className="text-lg text-white mb-1">฿{Math.floor(totalPay).toLocaleString()} <span className="text-[10px] text-gray-500">(@{hourlyRate}/h)</span></div>{isPartner && <button onClick={()=>handlePayCompensation(emp.id, emp.icName, Math.floor(totalPay))} disabled={isLoading} className="text-[10px] text-gray-400 hover:text-white uppercase tracking-widest mt-1">จ่ายเงิน & รีเซ็ต (Settle)</button>}</td>
                          {isPartner && <td className="py-6 pl-4 text-center"><button onClick={()=>handleDeleteEmployee(emp.id, emp.icName)} className="text-red-900 hover:text-red-500 transition-colors">✕</button></td>}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB MENU */}
            {ownerTab === "menu" && (
              <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-8">
                <div className="flex justify-between items-center mb-8">
                  <select value={menuFilterBranch} onChange={(e) => setMenuFilterBranch(e.target.value)} className="bg-transparent border-b border-white/20 text-white text-sm py-2 outline-none uppercase tracking-wider w-48"><option value="all">ทุกสาขา (ALL BRANCHES)</option>{branchList.map(b => <option key={b} value={b} className="bg-black">{b}</option>)}</select>
                  {isPartner && <button onClick={() => setShowAddMenuModal(true)} className="bg-white text-black px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-gray-200 transition-all">เพิ่มเมนู (Add Item)</button>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dbMenus.filter(m => menuFilterBranch === "all" || m.branch === menuFilterBranch).map(m => (
                    <div key={m.id} className="group flex items-center justify-between border-b border-white/5 pb-4 hover:border-white/20 transition-all">
                      <div className="flex items-center space-x-4 w-3/4">
                        <img src={m.img} alt="menu" className="w-14 h-14 object-cover rounded-md opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div>{menuFilterBranch === "all" && <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">{m.branch}</p>}<p className="font-medium text-white text-sm truncate">{m.name}</p><p className="text-gray-400 text-sm mt-0.5">฿{m.price.toLocaleString()}</p></div>
                      </div>
                      <div className="flex space-x-3 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setEditingMenu(m)} className="text-[10px] uppercase tracking-wider text-gray-400 hover:text-white">Edit</button>{isPartner && <button onClick={() => handleDeleteMenu(m.id, m.name)} className="text-[10px] uppercase tracking-wider text-red-900 hover:text-red-500">Del</button>}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CUSTOMERS */}
            {ownerTab === "customers" && (
              <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-8 overflow-x-auto">
                <div className="flex justify-between items-center mb-8"><h2 className="text-xl font-bold text-white tracking-tight">ฐานข้อมูลลูกค้า (CRM Database)</h2><span className="bg-white/5 px-4 py-1.5 rounded-full text-gray-400 text-[10px] uppercase tracking-widest border border-white/5">สมาชิกรวม (Total Members): {customerList.length}</span></div>
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-500 uppercase tracking-widest text-[10px] border-b border-white/10">
                    <tr><th className="pb-4 w-16 font-normal">Rank</th><th className="pb-4 font-normal">ชื่อลูกค้า (Client Identity)</th><th className="pb-4 font-normal">เบอร์ (Contact)</th><th className="pb-4 text-right font-normal">คะแนนสะสม (Reward Points)</th>{isPartner && <th className="pb-4 text-right font-normal">Action</th>}</tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {customerList.map((cust, index) => (
                      <tr key={cust.id} className="hover:bg-white/[0.02]">
                        <td className="py-6 text-gray-600 font-light">0{index + 1}</td>
                        <td className="py-6 font-medium text-white flex items-center">{index === 0 && <span className="w-1.5 h-1.5 rounded-full bg-white mr-3 shadow-[0_0_8px_#ffffff]"></span>}{cust.name}</td>
                        <td className="py-6 text-gray-500">{cust.phone}</td>
                        <td className="py-6 text-right text-lg text-white font-light">{cust.points?.toLocaleString() || 0}</td>
                        {isPartner && <td className="py-6 text-right"><button onClick={()=>handleUpdateCustomerPoints(cust.id, cust.points || 0, cust.name)} className="text-[10px] uppercase tracking-wider text-gray-500 hover:text-white transition-colors border border-white/10 px-3 py-1.5 rounded">ปรับคะแนน</button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal: เพิ่ม/แก้ไขเมนู */}
        {(showAddMenuModal || editingMenu) && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a0a0a] border border-white/10 p-10 rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-8"><h2 className="text-lg font-bold text-white tracking-widest uppercase">{editingMenu ? "แก้ไขสินค้า (Edit Item)" : "เพิ่มเมนูใหม่ (New Item)"}</h2><button onClick={() => {setShowAddMenuModal(false); setEditingMenu(null);}} className="text-gray-500 hover:text-white">✕</button></div>
              <form onSubmit={editingMenu ? handleSaveMenuData : handleAddNewMenu} className="space-y-6">
                {editingMenu && <div className="flex justify-center mb-6"><img src={editingMenu.img} className="w-24 h-24 object-cover rounded-lg border border-white/10 grayscale opacity-80" /></div>}
                {!editingMenu && (<div><select value={newMenuData.branch} onChange={e => setNewMenuData({ ...newMenuData, branch: e.target.value })} className="w-full bg-transparent border-b border-white/20 pb-3 text-white text-sm outline-none"><option value="Grip Bar" className="bg-black">Grip Bar</option><option value="Yozakaya" className="bg-black">Yozakaya</option><option value="K-Kart Speedway" className="bg-black">K-Kart Speedway</option><option value="Advance Performance" className="bg-black">Advance Performance</option></select></div>)}
                <div><input required value={editingMenu ? editingMenu.name : newMenuData.name} onChange={e => editingMenu ? setEditingMenu({ ...editingMenu, name: e.target.value }) : setNewMenuData({ ...newMenuData, name: e.target.value })} disabled={editingMenu && !isPartner} className="w-full bg-transparent border-b border-white/20 pb-3 text-white text-sm outline-none focus:border-white/50 placeholder:text-gray-600" placeholder="ชื่อสินค้า (Item Name)" /></div>
                <div><input type="number" required value={editingMenu ? editingMenu.price : newMenuData.price} onChange={e => editingMenu ? setEditingMenu({ ...editingMenu, price: e.target.value }) : setNewMenuData({ ...newMenuData, price: e.target.value })} className="w-full bg-transparent border-b border-white/20 pb-3 text-white text-sm outline-none focus:border-white/50 placeholder:text-gray-600" placeholder="ราคา (Price THB)" /></div>
                <div><input type="text" value={editingMenu ? editingMenu.img : newMenuData.img} onChange={e => editingMenu ? setEditingMenu({ ...editingMenu, img: e.target.value }) : setNewMenuData({ ...newMenuData, img: e.target.value })} className="w-full bg-transparent border-b border-white/20 pb-3 text-white text-sm outline-none focus:border-white/50 placeholder:text-gray-600" placeholder="ลิ้งก์รูปภาพ (Image URL)" /></div>
                <button type="submit" disabled={isLoading} className="w-full bg-white text-black font-bold py-4 rounded-lg tracking-widest text-[10px] uppercase hover:bg-gray-200 mt-6">{isLoading ? "Processing..." : "บันทึกข้อมูล (Save Details)"}</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: POS TERMINAL
  // ==========================================
  if (view === "menu") {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col font-sans relative text-white">
        <TopNav title={activeBranch} subtitle={`Terminal / ${currentUser?.icName}`} rightEl={<button onClick={handleClockOut} className="bg-white/10 hover:bg-white text-white hover:text-black px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors">ออกงาน (Clock Out)</button>} />
        
        <div className="flex flex-1 overflow-hidden h-[calc(100vh-73px)]">
          <div className="w-2/3 p-8 overflow-y-auto custom-scrollbar">
            
            {/* 🔴 ส่วนควบคุม Live Track Monitor (แสดงเฉพาะ K-Kart) */}
            {activeBranch === "K-Kart Speedway" && (
              <div className="mb-8">
                <h2 className="text-[10px] font-bold text-gray-500 mb-4 uppercase tracking-widest flex items-center">
                  <span className="text-white text-lg mr-2">🏎️</span> ระบบดูคิวและเวลา (Live Track Monitor)
                </h2>
                <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 shadow-xl">
                  {kartSessions.length === 0 ? (
                    <p className="text-gray-600 text-sm text-center">ไม่มีรถอยู่ในสนาม (No karts on track)</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {kartSessions.map(session => {
                        const remainingMs = (session.startTime + session.durationMins * 60000) - currentTime;
                        const remainingMins = Math.floor(Math.max(0, remainingMs) / 60000);
                        const remainingSecs = Math.floor((Math.max(0, remainingMs) % 60000) / 1000);
                        
                        let boxStyle = "bg-white/5 border-white/10 text-white";
                        if (remainingMs <= 0) boxStyle = "bg-red-900/20 border-red-500/50 text-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]";
                        else if (remainingMs <= 5 * 60000) boxStyle = "bg-yellow-900/20 border-yellow-500/50 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.1)]";

                        return (
                          <div key={session.id} className={`p-4 rounded-xl border flex flex-col items-center justify-center relative transition-all ${boxStyle}`}>
                            <p className="text-[10px] uppercase tracking-widest opacity-70 mb-1">Key ID</p>
                            <p className="text-3xl font-black mb-2">{session.keyId}</p>
                            <p className="text-xl font-bold font-mono tracking-widest mb-3">
                              {String(remainingMins).padStart(2, '0')}:{String(remainingSecs).padStart(2, '0')}
                            </p>
                            <button onClick={() => deleteDoc(doc(db, "kart_sessions", session.id))} className="text-[10px] uppercase font-bold bg-black/50 hover:bg-white hover:text-black px-4 py-1.5 rounded-full transition-all border border-white/10">
                              คืนกุญแจ
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <h2 className="text-[10px] font-bold text-gray-500 mb-4 uppercase tracking-widest">รายการสินค้า (Menu Catalog)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {currentMenus.map(item => (
                <div key={item.id} onClick={() => addToCart(item)} className="bg-[#0a0a0a] border border-white/5 p-4 rounded-2xl cursor-pointer hover:border-white/20 hover:-translate-y-1 transition-all group">
                  <div className="w-full h-32 mb-4 overflow-hidden rounded-xl border border-white/5">{item.img ? <img src={item.img} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all" /> : <div className="w-full h-full bg-white/5"></div>}</div>
                  <h3 className="font-medium text-sm text-gray-300 group-hover:text-white line-clamp-2">{item.name}</h3>
                  <p className="text-white font-bold mt-2 tracking-wide">฿{item.price.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="w-1/3 bg-[#0a0a0a] border-l border-white/5 flex flex-col z-30 shadow-2xl">
            <div className="p-8 border-b border-white/5">
              <h2 className="text-[10px] font-bold text-gray-500 mb-4 uppercase tracking-widest">ข้อมูลสมาชิกลูกค้า (Client Identity)</h2>
              {!currentCustomer ? (
                <div className="flex space-x-3">
                  <input type="text" value={customerSearchPhone} onChange={e => setCustomerSearchPhone(e.target.value)} placeholder="เบอร์โทรศัพท์ (Enter Phone)" className="flex-1 bg-transparent border-b border-white/20 pb-2 text-sm text-white focus:border-white/50 outline-none placeholder:text-gray-600" />
                  <button onClick={handleSearchCustomer} className="text-[10px] uppercase tracking-wider font-bold text-gray-400 hover:text-white">ค้นหา (Search)</button>
                  <button onClick={() => setShowRegisterModal(true)} className="text-[10px] uppercase tracking-wider font-bold text-white hover:text-gray-300">เพิ่ม (New)</button>
                </div>
              ) : (
                <div className="bg-[#111] border border-white/5 p-5 rounded-xl">
                  <div className="flex justify-between items-start mb-4"><div><p className="text-white font-medium text-sm">{currentCustomer.name}</p><p className="text-gray-400 font-medium text-xs mt-1 tracking-wider">{currentCustomer.points?.toLocaleString() || 0} PTS</p></div><button onClick={() => {setCurrentCustomer(null); setRedeemPoints(0);}} className="text-gray-500 hover:text-white text-[10px] uppercase tracking-wider">เปลี่ยน (Change)</button></div>
                  <div className="flex items-center justify-between border-t border-white/5 pt-4"><span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">ใช้คะแนน (Redeem Pts)</span><input type="number" min="0" max={currentCustomer.points} value={redeemPoints} onChange={(e) => { const val = Number(e.target.value); if(val > currentCustomer.points) setRedeemPoints(currentCustomer.points); else setRedeemPoints(val); }} className="w-16 bg-transparent border-b border-white/20 text-right text-white text-sm outline-none focus:border-white/50 pb-1" /></div>
                </div>
              )}
            </div>
            
            <div className="flex-1 p-8 overflow-y-auto space-y-4 custom-scrollbar">
              <h2 className="text-[10px] font-bold text-gray-500 mb-4 uppercase tracking-widest">รายการปัจจุบัน (Current Order)</h2>
              {cart.map((item, index) => (
                <div key={item.cartId || index} className="flex justify-between items-start group">
                  <div className="flex-1 pr-4">
                    <p className="text-sm text-gray-200 mb-1">
                      {item.name} 
                      {/* 🔴 โชว์เลขกุญแจในตะกร้าถ้ารถมีหมายเลข */}
                      {item.keyId && <span className="block text-gray-400 text-[10px] mt-0.5 tracking-widest">🔑 KEY: {item.keyId}</span>}
                    </p>
                    <p className="text-gray-500 text-[10px] tracking-wider">฿{item.price.toLocaleString()} × {item.qty}</p>
                  </div>
                  <div className="flex items-center space-x-3"><p className="text-white font-medium text-sm">฿{(item.price * item.qty).toLocaleString()}</p><button onClick={() => removeFromCart(item.cartId)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button></div>
                </div>
              ))}
              {cart.length === 0 && <div className="text-center text-gray-600 text-sm py-10">ยังไม่มีสินค้าในตะกร้า<br/><span className="text-[10px]">Cart is empty</span></div>}
            </div>

            <div className="p-8 border-t border-white/5 bg-[#050505]">
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between text-gray-400"><span className="tracking-wider text-[10px] uppercase">ยอดรวม (Subtotal)</span><span>฿{cartSubtotal.toLocaleString()}</span></div>
                {redeemPoints > 0 && <div className="flex justify-between text-white"><span className="tracking-wider text-[10px] uppercase">ส่วนลด (Discount)</span><span>-฿{redeemPoints.toLocaleString()}</span></div>}
                <div className="flex justify-between items-end pt-4 border-t border-white/10 mt-4"><span className="text-gray-500 text-[10px] tracking-widest uppercase">ยอดสุทธิ (Net Total)</span><span className="text-4xl font-light text-white tracking-tighter">฿{finalTotalAmount.toLocaleString()}</span></div>
              </div>
              <button onClick={handleCheckout} disabled={cart.length === 0 || isLoading} className="w-full bg-white hover:bg-gray-200 disabled:bg-white/10 disabled:text-gray-600 text-black font-bold py-4 rounded-lg tracking-widest text-[10px] uppercase transition-all">ยืนยันการชำระเงิน (Pay Now)</button>
            </div>
          </div>
        </div>

        {/* Modal: สมัครลูกค้าใหม่ */}
        {showRegisterModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a0a0a] border border-white/10 p-10 rounded-2xl w-full max-w-md">
              <div className="flex justify-between items-center mb-8"><h2 className="text-lg font-bold text-white tracking-widest uppercase">เพิ่มลูกค้าใหม่ (New Client)</h2><button onClick={() => setShowRegisterModal(false)} className="text-gray-500 hover:text-white">✕</button></div>
              <form onSubmit={handleRegisterCustomer} className="space-y-6">
                <div><input required value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} className="w-full bg-transparent border-b border-white/20 pb-3 text-white text-sm outline-none focus:border-white/50 placeholder:text-gray-600" placeholder="ชื่อ-นามสกุล (Full Name)" /></div>
                <div><input type="tel" required value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} className="w-full bg-transparent border-b border-white/20 pb-3 text-white text-sm outline-none focus:border-white/50 placeholder:text-gray-600" placeholder="เบอร์โทรศัพท์ (Contact Number)" /></div>
                <button type="submit" disabled={isLoading} className="w-full bg-white text-black font-bold py-4 rounded-lg tracking-widest text-[10px] uppercase hover:bg-gray-200 mt-6">บันทึกข้อมูล (Register)</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
