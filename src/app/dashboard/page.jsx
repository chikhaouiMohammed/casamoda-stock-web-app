// /app/dashboard/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
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
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Tooltip,
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
import { TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

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
  // For return modal
  const [showReturn, setShowReturn] = useState(false);
  const [currentSale, setCurrentSale] = useState(null);
  const [returnData, setReturnData] = useState({ quantity: '', price: '' });
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

  // 3️⃣ Recompute stats & daily table, including returns as negative, sorted oldest→newest
  useEffect(() => {
    if (!sales.length || !products.length) return;

    const [yD, mD, dD] = day.split('-').map(Number);
    const dayStart   = new Date(yD, mD-1, dD, 0,0,0);
    const dayEnd     = new Date(yD, mD-1, dD+1, 0,0,0);

    const [yM, mM]    = month.split('-').map(Number);
    const monthStart = new Date(yM, mM-1, 1, 0,0,0);
    const monthEnd   = new Date(yM, mM,   1, 0,0,0);

    const sum = arr => arr.reduce((a,{ quantity, price }) => a + quantity*price, 0);
    const filterBy = (arr, start, end) =>
      arr.filter(x => { const t = x.date.toDate(); return t>=start && t<end; });

    const sd = filterBy(sales, dayStart, dayEnd);
    const rd = filterBy(returns_, dayStart, dayEnd);
    const sm = filterBy(sales, monthStart, monthEnd);
    const rm = filterBy(returns_, monthStart, monthEnd);

    const revDay   = sum(sd) - sum(rd);
    const revMonth = sum(sm) - sum(rm);
    const qtyDay   = sd.reduce((a,{quantity})=>a+quantity,0)
                   - rd.reduce((a,{quantity})=>a+quantity,0);
    const avgDay   = sd.length ? revDay/sd.length : 0;

    setDayRevenue(revDay);
    setMonthRevenue(revMonth);
    setProductsSoldDay(qtyDay);
    setAvgBasketDay(avgDay);  

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

    // Sort oldest first
    const combined = [...saleRecords, ...returnRecords].sort((a,b) =>
      a.date.toDate() - b.date.toDate()
    );

    setDailyRecords(combined);
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

  const [showDelete, setShowDelete] = useState(false);
  const [delId, setDelId] = useState('');

  // Delete sale, return, or product handler
  const handleDeleteSale = async () => {
    try {
      // Try to find in sales first
      let record = sales.find(s => s.id === delId);
      let collectionName = 'sales';
      let isReturn = false;
      if (!record) {
        // Try to find in returns
        record = returns_.find(r => r.id === delId);
        collectionName = 'returns';
        isReturn = true;
      }
      // If not found in sales or returns, check if it's a product id (cascade delete)
      if (!record) {
        // ...existing code for product deletion...
        const product = products.find(p => p.id === delId);
        if (product) {
          await import('firebase/firestore').then(async ({ deleteDoc, doc }) => {
            // Delete all sales
            const salesToDelete = sales.filter(s => s.productId === product.id);
            for (const s of salesToDelete) {
              await deleteDoc(doc(db, 'sales', s.id));
            }
            // Delete all returns
            const returnsToDelete = returns_.filter(r => r.productId === product.id);
            for (const r of returnsToDelete) {
              await deleteDoc(doc(db, 'returns', r.id));
            }
            // Delete the product itself
            await deleteDoc(doc(db, 'products', product.id));
          });
          setSales(prev => prev.filter(s => s.productId !== product.id));
          setReturns(prev => prev.filter(r => r.productId !== product.id));
          setProducts(prev => prev.filter(p => p.id !== product.id));
          setShowDelete(false);
          return;
        } else {
          throw new Error('Enregistrement introuvable.');
        }
      }

      // Find the product to update
      let product = products.find(p => p.id === record.productId);
      // If not found by id, try by name
      if (!product && record.name) {
        product = products.find(p => p.name === record.name);
      }
      if (!product) throw new Error('Produit introuvable.');

      // Do not cascade delete returns when deleting a sale. User must delete returns manually.

      // Update product quantity in Firestore
      const productRef = doc(db, 'products', product.id);
      await import('firebase/firestore').then(async ({ updateDoc }) => {
        // For sales: add back the quantity. For returns: subtract the returned quantity.
        let newQty = product.quantity;
        if (isReturn) {
          newQty = (product.quantity || 0) - Math.abs(record.quantity);
        } else {
          newQty = (product.quantity || 0) + Math.abs(record.quantity);
        }
        await updateDoc(productRef, {
          quantity: newQty
        });
      });

      // Delete the record from the correct collection
      await deleteDoc(doc(db, collectionName, delId));
      if (isReturn) {
        setReturns(prev => prev.filter(r => r.id !== delId));
      } else {
        setSales(prev => prev.filter(s => s.id !== delId));
      }
      // Re-fetch products to update stock in UI
      const pSnap = await getDocs(collection(db, 'products'));
      setProducts(pSnap.docs.map(d=>({ id:d.id, ...d.data() })));
      setShowDelete(false);
    } catch (error) {
      alert('Erreur lors de la suppression.');
    }
  };

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
                    <TableHeadCell>Prix d'origine (DA)</TableHeadCell>
                    <TableHeadCell>PU (DA)</TableHeadCell>
                    <TableHeadCell>Total (DA)</TableHeadCell>
                    <TableHeadCell>Action</TableHeadCell>
                  </TableRow>
                </TableHead>
                <FlowTableBody className="divide-y">
                  {dailyRecords.map(r => (
                    <TableRow key={r.id} className="hover:bg-gray-50">
                      <TableCell>{formatFirebaseDate(r.date)}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.quantity}</TableCell>
                      <TableCell>{
                        // Find the original price from products array
                        (() => {
                          const product = products.find(p => p.name === r.name || p.id === r.productId);
                          return product ? product.price?.toFixed(2) || '—' : '—';
                        })()
                      }</TableCell>
                      <TableCell>{r.unitPrice.toFixed(2)}</TableCell>
                      <TableCell>{r.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {/* Récupérer button only for sales */}
                          {r.quantity > 0 && (
                            <Tooltip content="Récupérer" placement="top">
                              <span
                                onClick={() => {
                                  setCurrentSale(r);
                                  setReturnData({ quantity: r.quantity.toString(), price: r.unitPrice.toString() });
                                  setShowReturn(true);
                                }}
                                className="cursor-pointer rounded-full p-2 hover:bg-blue-100 transition"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <ArrowPathIcon className="h-6 w-6 text-purple-500" />
                              </span>
                            </Tooltip>
                          )}
                          {/* Delete button for both sales and returns */}
                          <Tooltip content={r.quantity > 0 ? "Supprimer la vente" : "Supprimer le retour"} placement="top">
                            <span
                              onClick={() => { setDelId(r.id); setShowDelete(true); }}
                              className="cursor-pointer rounded-full p-2 hover:bg-gray-100 transition"
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <TrashIcon className="h-6 w-6 text-red-500" />
                            </span>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </FlowTableBody>
              </Table>
            </div>
          )}
        </div>
        {/* Delete Modal */}
        <Modal show={showDelete} onClose={() => setShowDelete(false)}>
          <ModalHeader>Confirmer la suppression</ModalHeader>
          <ModalBody className="text-center">
            <TrashIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-700 mb-4">Cette action est irréversible.</p>
          </ModalBody>
          <ModalFooter className="justify-center">
            <Button color="light" onClick={() => setShowDelete(false)} className="mr-3">Annuler</Button>
            <Button color="red" onClick={handleDeleteSale}>Supprimer définitivement</Button>
          </ModalFooter>
        </Modal>

        {/* Return Modal */}
        <Modal show={showReturn} onClose={() => setShowReturn(false)}>
          <ModalHeader>Enregistrer un retour</ModalHeader>
          <ModalBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantité récupérée</label>
              <input
                type="number"
                className="border rounded px-2 py-1 w-full"
                value={returnData.quantity}
                min="1"
                max={currentSale?.quantity}
                onChange={e => setReturnData({ ...returnData, quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Montant remboursé</label>
              <input
                type="number"
                className="border rounded px-2 py-1 w-full"
                value={returnData.price}
                step="0.01"
                onChange={e => setReturnData({ ...returnData, price: e.target.value })}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={() => setShowReturn(false)}>Annuler</Button>
            <Button color="green" onClick={async () => {
              if (!currentSale || !returnData.quantity || !returnData.price) return;
              const qty = parseInt(returnData.quantity, 10);
              const price = parseFloat(returnData.price);
              // Ensure productId exists
              let productId = currentSale.productId;
              if (!productId) {
                // Try to find product by name
                const productByName = products.find(p => p.name === currentSale.name);
                if (productByName) productId = productByName.id;
              }
              if (!productId) {
                alert('Impossible de trouver le produit pour ce retour.');
                return;
              }
              await import('firebase/firestore').then(async ({ addDoc, collection, serverTimestamp, updateDoc, doc: docRef }) => {
                const now = new Date();
                const docRefReturn = await addDoc(collection(db, 'returns'), {
                  productId,
                  quantity: qty,
                  price,
                  date: serverTimestamp(),
                });
                // Update product quantity (add back the returned quantity)
                const product = products.find(p => p.id === productId);
                if (product) {
                  await updateDoc(docRef(db, 'products', product.id), { quantity: (product.quantity || 0) + Math.abs(qty) });
                }
                // Add to local returns_ state for immediate UI update
                setReturns(prev => [
                  ...prev,
                  {
                    id: docRefReturn.id,
                    productId,
                    quantity: qty,
                    price,
                    date: { toDate: () => now },
                  }
                ]);
              });
              // Re-fetch products to update stock in UI
              const pSnap = await getDocs(collection(db, 'products'));
              setProducts(pSnap.docs.map(d=>({ id:d.id, ...d.data() })));
              setShowReturn(false);
            }}>Confirmer le retour</Button>
          </ModalFooter>
        </Modal>

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
            <LineChart
              data={chartData}
              margin={{ top:10, right:30, left:0, bottom:0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" tickLine={false} />
              <YAxis tickLine={false} tick={{ fontSize:12 }} tickFormatter={v=>`${v}DA`} />
              <ReTooltip formatter={v=>`${v.toFixed(2)} DA`} />
              <Line type="monotone" dataKey="revenu" stroke="#005D2F" strokeWidth={2} dot={{r:4}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
