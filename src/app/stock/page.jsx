// /app/stock/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import AppNavbar from '@/components/AppNavbar';
import { auth, db } from '../../../utils/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card } from 'flowbite-react';
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

  // —— Original state & logic ——
  const storeId = 'akcher';

  // Firestore data
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [sales, setSales]           = useState([]);
  const [returns_, setReturns]      = useState([]);

  // Metrics
  const [totalRevenue, setTotalRevenue]       = useState(0);
  const [totalSalesQty, setTotalSalesQty]     = useState(0);
  const [totalReturnsQty, setTotalReturnsQty] = useState(0);

  // Chart data
  const [pieData, setPieData] = useState([]);
  const [barData, setBarData] = useState([]);

  // Month filter for pie chart
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substr(0, 7)
  );

  const COLORS = ['#005D2F','#66b386','#339a5c','#008133','#006729'];

  // Load Firestore data for this store
  useEffect(() => {
    (async () => {
      const [pSnap, cSnap, sSnap, rSnap] = await Promise.all([
        getDocs(query(collection(db, 'products'), where('storeId', '==', storeId))),
        getDocs(query(collection(db, 'categories'), where('storeId', '==', storeId))),
        getDocs(query(collection(db, 'sales'), where('storeId', '==', storeId))),
        getDocs(query(collection(db, 'returns'), where('storeId', '==', storeId))),
      ]);
      setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCategories(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSales(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setReturns(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    })();
  }, [storeId]);

  // Compute metrics (annual) and bar chart
  useEffect(() => {
    if (!sales.length) return;

    const sum = arr => arr.reduce((a, { quantity, price }) => a + quantity * price, 0);
    const rev = sum(sales) - sum(returns_);
    setTotalRevenue(rev);
    setTotalSalesQty(sales.reduce((a, { quantity }) => a + quantity, 0));
    setTotalReturnsQty(returns_.reduce((a, { quantity }) => a + quantity, 0));

    // Bar by month (current year)
    const year = new Date().getFullYear();
    const months = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
    const bar = months.map(mo => ({ mois: mo, revenu: 0 }));
    sales.forEach(s => {
      const d = s.date.toDate();
      if (d.getFullYear() === year) {
        bar[d.getMonth()].revenu += s.quantity * s.price;
      }
    });
    returns_.forEach(r => {
      const d = r.date.toDate();
      if (d.getFullYear() === year) {
        bar[d.getMonth()].revenu -= r.quantity * r.price;
      }
    });
    setBarData(bar);
  }, [sales, returns_, products, categories]);

  // Compute pieData whenever sales/returns or selectedMonth change
  useEffect(() => {
    if (!sales.length) return;

    // parse selectedMonth
    const [y, m] = selectedMonth.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 1);

    // filter by month
    const salesM   = sales.filter(s => {
      const d = s.date.toDate();
      return d >= start && d < end;
    });
    const returnsM = returns_.filter(r => {
      const d = r.date.toDate();
      return d >= start && d < end;
    });

    // aggregate rev by product
    const revByProd = {};
    salesM.forEach(s => {
      revByProd[s.productId] = (revByProd[s.productId] || 0) + s.quantity * s.price;
    });
    returnsM.forEach(r => {
      revByProd[r.productId] = (revByProd[r.productId] || 0) - r.quantity * r.price;
    });

    // group by category
    const byCat = {};
    Object.entries(revByProd).forEach(([pid, val]) => {
      const prod = products.find(p => p.id === pid);
      const catName = categories.find(c => c.id === prod?.categoryId)?.name || 'Non-catég.';
      byCat[catName] = (byCat[catName] || 0) + val;
    });

    setPieData(Object.entries(byCat).map(([name, value]) => ({ name, value })));
  }, [sales, returns_, products, categories, selectedMonth]);

  // Only render once auth is verified
  if (checkingAuth) return null;

  return (
    <>
      <AppNavbar />

      <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="bg-white">
            <h5 className="text-lg text-gray-400">Produits</h5>
            <p className="mt-1 text-2xl font-bold text-white">{products.length}</p>
          </Card>
          <Card className="bg-white">
            <h5 className="text-lg text-gray-400">Catégories</h5>
            <p className="mt-1 text-2xl font-bold text-white">{categories.length}</p>
          </Card>
          <Card className="bg-white">
            <h5 className="text-lg text-gray-400">Ventes</h5>
            <p className="mt-1 text-2xl font-bold text-white">{totalSalesQty}</p>
          </Card>
          <Card className="bg-white">
            <h5 className="text-lg text-gray-400">Retours</h5>
            <p className="mt-1 text-2xl font-bold text-white">{totalReturnsQty}</p>
          </Card>
          <Card className="bg-white">
            <h5 className="text-lg text-gray-400">CA Total</h5>
            <p className="mt-1 text-2xl font-bold text-white">{totalRevenue.toFixed(2)} DA</p>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie chart + Month picker */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Répartition du CA</h3>
              <input
                type="month"
                className="border rounded px-2 py-1 bg-white"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              />
            </div>
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
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
                <ReTooltip formatter={v => `${v.toFixed(2)} DA`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart (yearly) */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              CA mensuel ({new Date().getFullYear()})
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" tickLine={false} />
                <YAxis tickLine={false} tick={{ fontSize: 12 }} tickFormatter={v => `${v}DA`} />
                <ReTooltip formatter={v => `${v.toFixed(2)} DA`} />
                <Bar dataKey="revenu" fill="#005D2F" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
