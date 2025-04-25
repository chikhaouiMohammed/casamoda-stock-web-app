// /app/dashboard/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import AppNavbar from '@/components/AppNavbar';
import { auth, db } from '../../../utils/firebase';

// Flowbite
import {
  Table,
  TableHead,
  TableHeadCell,
  TableBody as FlowTableBody,
  TableRow,
  TableCell,
} from 'flowbite-react';

// Recharts
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
} from 'recharts';

// Date formatting helper
const formatFirebaseDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate();
  return `${date.getDate().toString().padStart(2, '0')}/${
    (date.getMonth() + 1).toString().padStart(2, '0')}/${
    date.getFullYear()} ${
    date.getHours().toString().padStart(2, '0')}:${
    date.getMinutes().toString().padStart(2, '0')}`;
};

export default function DashboardPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Firestore data
  const [sales, setSales]       = useState([]);
  const [returns_, setReturns]  = useState([]);
  const [products, setProducts] = useState([]);

  // Date pickers
  const [day, setDay]     = useState(new Date().toISOString().substr(0,10));
  const [month, setMonth] = useState(new Date().toISOString().substr(0,7));
  const [year, setYear]   = useState(new Date().getFullYear().toString());

  // Metrics & daily table
  const [dayRevenue, setDayRevenue]           = useState(0);
  const [monthRevenue, setMonthRevenue]       = useState(0);
  const [productsSoldDay, setProductsSoldDay] = useState(0);
  const [avgBasketDay, setAvgBasketDay]       = useState(0);
  const [dailyRecords, setDailyRecords]       = useState([]);

  // Annual chart
  const [chartData, setChartData]             = useState([]);

  // 1️⃣ Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace('/login');
      else       setCheckingAuth(false);
    });
    return () => unsub();
  }, [router]);

  // 2️⃣ Load all data once authenticated
  useEffect(() => {
    if (checkingAuth) return;
    (async () => {
      const [sSnap, rSnap, pSnap] = await Promise.all([
        getDocs(collection(db, 'sales')),
        getDocs(collection(db, 'returns')),
        getDocs(collection(db, 'products')),
      ]);
      setSales(  sSnap.docs.map(d=>({ id:d.id, ...d.data() })) );
      setReturns(rSnap.docs.map(d=>({ id:d.id, ...d.data() })) );
      setProducts(pSnap.docs.map(d=>({ id:d.id, ...d.data() })) );
    })();
  }, [checkingAuth]);

  // 3️⃣ Recompute stats & daily table (now including returns as negative lines)
  useEffect(() => {
    if (!sales.length || !products.length) return;

    // build start/end bounds
    const [yD,mD,dD] = day.split('-').map(Number);
    const dayStart   = new Date(yD, mD-1, dD, 0,0,0);
    const dayEnd     = new Date(yD, mD-1, dD+1, 0,0,0);

    const [yM,mM]    = month.split('-').map(Number);
    const monthStart = new Date(yM, mM-1, 1, 0,0,0);
    const monthEnd   = new Date(yM, mM,   1, 0,0,0);

    const sum = arr => arr.reduce((a,{ quantity, price }) => a + quantity*price, 0);
    const filterBy = (arr, start, end) =>
      arr.filter(x => { const t = x.date.toDate(); return t>=start && t<end; });

    // today's sales & returns
    const sd = filterBy(sales, dayStart, dayEnd);
    const rd = filterBy(returns_, dayStart, dayEnd);
    // this month's sales & returns
    const sm = filterBy(sales, monthStart, monthEnd);
    const rm = filterBy(returns_, monthStart, monthEnd);

    // metrics
    const revDay   = sum(sd) - sum(rd);
    const revMonth = sum(sm) - sum(rm);
    const qtyDay   = sd.reduce((a,{quantity})=>a+quantity,0)
                   - rd.reduce((a,{quantity})=>a+quantity,0);
    const avgDay   = sd.length ? revDay/sd.length : 0;

    setDayRevenue(revDay);
    setMonthRevenue(revMonth);
    setProductsSoldDay(qtyDay);
    setAvgBasketDay(avgDay);

    // now build dailyRecords *including* returns entries as negatives
    const saleRecords = sd.map(sale => {
      const name = sale.productName
        ?? products.find(p=>p.id===sale.productId)?.name
        ?? '—';
      return {
        id:        sale.id,
        name,
        quantity:  sale.quantity,
        unitPrice: sale.price,
        total:     sale.quantity * sale.price,
        date:      sale.date,
      };
    });
    const returnRecords = rd.map(ret => {
      const name = products.find(p=>p.id===ret.productId)?.name ?? '—';
      return {
        id:        ret.id,
        name,
        quantity:  -ret.quantity,
        unitPrice: ret.price,
        total:     -ret.quantity * ret.price,
        date:      ret.date,
      };
    });

    setDailyRecords([...saleRecords, ...returnRecords]);
  }, [sales, returns_, products, day, month]);

  // 4️⃣ Annual chart
  useEffect(() => {
    if (!sales.length) return;
    const y = Number(year);
    const months = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
    const arr = months.map(mo => ({ mois: mo, revenu: 0 }));

    sales.forEach(s => {
      const t = s.date.toDate();
      if (t.getFullYear() === y) arr[t.getMonth()].revenu += s.quantity*s.price;
    });
    returns_.forEach(r => {
      const t = r.date.toDate();
      if (t.getFullYear() === y) arr[t.getMonth()].revenu -= r.quantity*r.price;
    });

    setChartData(arr);
  }, [sales, returns_, year]);

  if (checkingAuth) return null;

  return (
    <>
      <AppNavbar />

      <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
        {/* Date pickers */}
        <div className="flex gap-4">
          <input
            type="date"
            className="border rounded px-2 py-1 bg-white"
            value={day}
            onChange={e=>setDay(e.target.value)}
          />
          <input
            type="month"
            className="border rounded px-2 py-1 bg-white"
            value={month}
            onChange={e=>setMonth(e.target.value)}
          />
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white shadow rounded-lg p-5">
            <h4 className="text-sm text-gray-500">Revenu du jour</h4>
            <p className="mt-2 text-2xl font-semibold text-gray-800">
              {dayRevenue.toFixed(2)} DA
            </p>
          </div>
          <div className="bg-white shadow rounded-lg p-5">
            <h4 className="text-sm text-gray-500">Revenu du mois</h4>
            <p className="mt-2 text-2xl font-semibold text-gray-800">
              {monthRevenue.toFixed(2)} DA
            </p>
          </div>
          <div className="bg-white shadow rounded-lg p-5">
            <h4 className="text-sm text-gray-500">Produits vendus (jour)</h4>
            <p className="mt-2 text-2xl font-semibold text-gray-800">
              {productsSoldDay}
            </p>
          </div>
          <div className="bg-white shadow rounded-lg p-5">
            <h4 className="text-sm text-gray-500">Panier moyen (jour)</h4>
            <p className="mt-2 text-2xl font-semibold text-gray-800">
              {avgBasketDay.toFixed(2)} DA
            </p>
          </div>
        </div>

        {/* Daily sales + returns list */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-700 mb-4">
            Ventes du {day}
          </h3>
          {dailyRecords.length === 0 ? (
            <p className="text-gray-500">Aucune transaction ce jour.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHead className="bg-gray-50">
                  <TableRow>
                    <TableHeadCell>Date/Heure</TableHeadCell>
                    <TableHeadCell>Produit</TableHeadCell>
                    <TableHeadCell>Quantité</TableHeadCell>
                    <TableHeadCell>PU (DA)</TableHeadCell>
                    <TableHeadCell>Total (DA)</TableHeadCell>
                  </TableRow>
                </TableHead>
                <FlowTableBody className="divide-y">
                  {dailyRecords.map(r => (
                    <TableRow key={r.id} className="hover:bg-gray-50">
                      <TableCell>
                        {formatFirebaseDate(r.date)}
                      </TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.quantity}</TableCell>
                      <TableCell>{r.unitPrice.toFixed(2)}</TableCell>
                      <TableCell>{r.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </FlowTableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Annual chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-700">
              Revenu annuel ({year})
            </h3>
            <input
              type="number"
              min="2020"
              max="2100"
              className="border rounded px-2 py-1 bg-white w-24"
              value={year}
              onChange={e=>setYear(e.target.value)}
            />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top:10, right:30, left:0, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" tickLine={false} />
              <YAxis tickLine={false} tick={{ fontSize:12 }} tickFormatter={v=>`${v}DA`} />
              <ReTooltip formatter={v=>`${v.toFixed(2)} DA`} />
              <Line type="monotone" dataKey="revenu" stroke="#005D2F" strokeWidth={2} dot={{r:4}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}