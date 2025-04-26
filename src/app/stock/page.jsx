// /app/stock/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter }            from 'next/navigation';
import { onAuthStateChanged }   from 'firebase/auth';
import AppNavbar                from '@/components/AppNavbar';
import { auth, db }             from '../../../utils/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card }                 from 'flowbite-react';
import {
  PieChart, Pie, Cell, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer
} from 'recharts';

export default function StatistiquesPage() {
  const router = useRouter();

  // —— Auth guard ——
  const [checkingAuth, setCheckingAuth] = useState(true);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) {
        router.replace('/login');
      } else {
        setCheckingAuth(false);
      }
    });
    return unsub;
  }, [router]);

  const storeId = 'akcher';

  // Firestore data
  const [products,    setProducts]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [sales,       setSales]       = useState([]);
  const [returns_,    setReturns]     = useState([]);

  // Toggle view: 'day' or 'month'
  const [view,      setView]      = useState('day');

  // Date filters
  const [selectedDay,   setSelectedDay]   = useState(() => new Date().toISOString().substr(0,10));
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substr(0,7));

  // Daily metrics
  const [dayRevenue,      setDayRevenue]      = useState(0);
  const [daySalesQty,     setDaySalesQty]     = useState(0);
  const [dayReturnsQty,   setDayReturnsQty]   = useState(0);
  const [dayProductsSold, setDayProductsSold] = useState(0);

  // Monthly metrics
  const [monthRevenue,       setMonthRevenue]       = useState(0);
  const [monthSalesQty,      setMonthSalesQty]      = useState(0);
  const [monthReturnsQty,    setMonthReturnsQty]    = useState(0);
  const [monthProductsSold,  setMonthProductsSold]  = useState(0);

  // Annual & charts
  const [totalRevenue,    setTotalRevenue]    = useState(0);
  const [totalSalesQty,   setTotalSalesQty]   = useState(0);
  const [totalReturnsQty, setTotalReturnsQty] = useState(0);
  const [pieData,         setPieData]         = useState([]);
  const [barData,         setBarData]         = useState([]);

  const COLORS = ['#005D2F','#66b386','#339a5c','#008133','#006729'];

  // Load Firestore data
  useEffect(() => {
    (async () => {
      const [pSnap, cSnap, sSnap, rSnap] = await Promise.all([
        getDocs(query(collection(db,'products'),   where('storeId','==',storeId))),
        getDocs(query(collection(db,'categories'), where('storeId','==',storeId))),
        getDocs(query(collection(db,'sales'),      where('storeId','==',storeId))),
        getDocs(query(collection(db,'returns'),    where('storeId','==',storeId))),
      ]);
      setProducts(  pSnap.docs.map(d=>({ id:d.id, ...d.data() })));
      setCategories(cSnap.docs.map(d=>({ id:d.id, ...d.data() })));
      setSales(     sSnap.docs.map(d=>({ id:d.id, ...d.data() })));
      setReturns(   rSnap.docs.map(d=>({ id:d.id, ...d.data() })));
    })();
  }, [storeId]);

  // Compute daily metrics
  useEffect(() => {
    if (!sales.length) return;

    const [y,m,d] = selectedDay.split('-').map(Number);
    const start = new Date(y,m-1,d,0,0,0);
    const end   = new Date(y,m-1,d+1,0,0,0);

    const inRange = arr => arr.filter(x => {
      const t = x.date.toDate();
      return t>=start && t<end;
    });

    const sd = inRange(sales);
    const rd = inRange(returns_);
    const sum = recs => recs.reduce((a,{quantity,price}) => a + quantity*price, 0);

    setDayRevenue(      sum(sd) - sum(rd));
    setDaySalesQty(     sd.reduce((a,{quantity})=>a+quantity,0));
    setDayReturnsQty(   rd.reduce((a,{quantity})=>a+quantity,0));
    setDayProductsSold( sd.reduce((a,{quantity})=>a+quantity,0) - rd.reduce((a,{quantity})=>a+quantity,0));
  }, [sales, returns_, selectedDay]);

  // Compute monthly metrics
  useEffect(() => {
    if (!sales.length) return;

    const [y,m] = selectedMonth.split('-').map(Number);
    const start = new Date(y,m-1,1,0,0,0);
    const end   = new Date(y,m,1,0,0,0);

    const inRange = arr => arr.filter(x => {
      const t = x.date.toDate();
      return t>=start && t<end;
    });

    const sm = inRange(sales);
    const rm = inRange(returns_);
    const sum = recs => recs.reduce((a,{quantity,price}) => a + quantity*price, 0);

    setMonthRevenue(      sum(sm) - sum(rm));
    setMonthSalesQty(     sm.reduce((a,{quantity})=>a+quantity,0));
    setMonthReturnsQty(   rm.reduce((a,{quantity})=>a+quantity,0));
    setMonthProductsSold( sm.reduce((a,{quantity})=>a+quantity,0) - rm.reduce((a,{quantity})=>a+quantity,0));
  }, [sales, returns_, selectedMonth]);

  // Annual & bar chart
  useEffect(() => {
    if (!sales.length) return;
    const sum = arr => arr.reduce((a,{quantity,price})=>a + quantity*price, 0);
    setTotalRevenue(    sum(sales) - sum(returns_));
    setTotalSalesQty(   sales.reduce((a,{quantity})=>a+quantity,0));
    setTotalReturnsQty( returns_.reduce((a,{quantity})=>a+quantity,0));

    const yr = new Date().getFullYear();
    const months = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
    const bar = months.map(mo=>({ mois:mo, revenu:0 }));

    sales.forEach(s => {
      const t = s.date.toDate();
      if (t.getFullYear()===yr) bar[t.getMonth()].revenu += s.quantity*s.price;
    });
    returns_.forEach(r => {
      const t = r.date.toDate();
      if (t.getFullYear()===yr) bar[t.getMonth()].revenu -= r.quantity*r.price;
    });

    setBarData(bar);
  }, [sales, returns_]);

  // Pie chart for selectedMonth
  useEffect(() => {
    if (!sales.length) return;

    const [y,m] = selectedMonth.split('-').map(Number);
    const start = new Date(y,m-1,1);
    const end   = new Date(y,m,1);

    const salesM   = sales.filter(s => {
      const d = s.date.toDate();
      return d>=start && d<end;
    });
    const returnsM = returns_.filter(r => {
      const d = r.date.toDate();
      return d>=start && d<end;
    });

    const revByProd = {};
    salesM.forEach(s   => revByProd[s.productId] = (revByProd[s.productId]||0) + s.quantity*s.price);
    returnsM.forEach(r => revByProd[r.productId] = (revByProd[r.productId]||0) - r.quantity*r.price);

    const byCat = {};
    Object.entries(revByProd).forEach(([pid,val]) => {
      const prod = products.find(p=>p.id===pid);
      const name = categories.find(c=>c.id===prod?.categoryId)?.name || 'Non-catég.';
      byCat[name] = (byCat[name]||0) + val;
    });

    setPieData(Object.entries(byCat).map(([name,value])=>({ name, value })));
  }, [sales, returns_, products, categories, selectedMonth]);

  if (checkingAuth) return null;

  // Choose cards
  const cards = view === 'day'
    ? [
        { label: 'Ventes (jour)',   value: daySalesQty },
        { label: 'Retours (jour)',  value: dayReturnsQty },
        { label: 'CA Total (jour)', value: `${dayRevenue.toFixed(2)} DA` },
        { label: 'Produits vendus', value: dayProductsSold },
      ]
    : [
        { label: 'Ventes (mois)',   value: monthSalesQty },
        { label: 'Retours (mois)',  value: monthReturnsQty },
        { label: 'CA Total (mois)', value: `${monthRevenue.toFixed(2)} DA` },
        { label: 'Produits vendus', value: monthProductsSold },
      ];

  return (
    <>
      <AppNavbar />

      <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
        {/* View toggle */}
        <div className="flex gap-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="view"
              value="day"
              checked={view==='day'}
              onChange={() => setView('day')}
              className="mr-2"
            />
            Par jour
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="view"
              value="month"
              checked={view==='month'}
              onChange={() => setView('month')}
              className="mr-2"
            />
            Par mois
          </label>
        </div>

        {/* Date picker */}
        <div className="flex gap-4">
          {view==='day'
            ? <input
                type="date"
                className="border rounded px-2 py-1 bg-white"
                value={selectedDay}
                onChange={e=>setSelectedDay(e.target.value)}
              />
            : <input
                type="month"
                className="border rounded px-2 py-1 bg-white"
                value={selectedMonth}
                onChange={e=>setSelectedMonth(e.target.value)}
              />
          }
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((c,i) => (
            <Card key={i} className="bg-white">
              <h5 className="text-lg text-gray-400">{c.label}</h5>
              <p className="mt-1 text-2xl font-bold text-white">{c.value}</p>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Répartition du CA ({selectedMonth})
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {pieData.map((_,i)=>(
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36}/>
                <ReTooltip formatter={v=>`${v.toFixed(2)} DA`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              CA annuel ({new Date().getFullYear()})
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} margin={{ top:10, right:30, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" tickLine={false} />
                <YAxis tickLine={false} tick={{ fontSize:12 }} tickFormatter={v=>`${v}DA`} />
                <ReTooltip formatter={v=>`${v.toFixed(2)} DA`} />
                <Bar dataKey="revenu" fill="#005D2F" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
