// /app/products/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Table,
  TableHead,
  TableHeadCell,
  TableBody as FlowTableBody,
  TableRow,
  TableCell,
  Select,
  TextInput,
  Badge,
  Tooltip,
  Label,
} from 'flowbite-react';
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import AppNavbar from '@/components/AppNavbar';
import { auth, db } from '../../../utils/firebase';

export default function ProductsPage() {
  const router = useRouter();

  // —— Auth guard ——
  const [checkingAuth, setCheckingAuth] = useState(true);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
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
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAdd, setShowAdd] = useState(false);
  const [showSale, setShowSale] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [transactionData, setTransactionData] = useState({ quantity: '', price: '' });
  const [input, setInput] = useState({ name: '', categoryId: '', price: '', quantity: '' });
  const [delId, setDelId] = useState('');

  // Fetch data
  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const fetchCategories = async () => {
    const snap = await getDocs(
      query(collection(db, 'categories'), where('storeId', '==', storeId))
    );
    setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const fetchProducts = async () => {
    setLoading(true);
    const snap = await getDocs(
      query(collection(db, 'products'), where('storeId', '==', storeId))
    );
    setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  // Handle sale/return
  const handleTransaction = async (isReturn = false) => {
    if (!currentProduct || !transactionData.quantity || !transactionData.price) return;
    const qty = parseInt(transactionData.quantity, 10);
    const price = parseFloat(transactionData.price);
    // update stock
    const newStock = currentProduct.quantity + (isReturn ? qty : -qty);
    await updateDoc(doc(db, 'products', currentProduct.id), { quantity: newStock });
    // record transaction
    await addDoc(collection(db, isReturn ? 'returns' : 'sales'), {
      productId: currentProduct.id,
      quantity: qty,
      price,
      date: serverTimestamp(),
      storeId,
    });
    setShowSale(false);
    setShowReturn(false);
    setTransactionData({ quantity: '', price: '' });
    await fetchProducts();
    // feedback to user
    window.alert(isReturn ? 'Retour enregistré avec succès !' : 'Vente enregistrée avec succès !');
  };

  // Add/edit product
  const submitProduct = async () => {
    const data = {
      name: input.name,
      categoryId: input.categoryId,
      price: parseFloat(input.price) || 0,
      quantity: parseInt(input.quantity, 10) || 0,
      storeId,
      updatedAt: serverTimestamp(),
    };
    if (currentProduct) {
      await updateDoc(doc(db, 'products', currentProduct.id), data);
      window.alert('Produit mis à jour avec succès !');
    } else {
      await addDoc(collection(db, 'products'), { ...data, createdAt: serverTimestamp() });
      window.alert('Nouveau produit créé avec succès !');
    }
    setShowAdd(false);
    setInput({ name: '', categoryId: '', price: '', quantity: '' });
    fetchProducts();
  };

  const openEdit = (product) => {
    setCurrentProduct(product);
    setInput({
      name: product.name,
      categoryId: product.categoryId,
      price: product.price.toString(),
      quantity: product.quantity.toString(),
    });
    setShowAdd(true);
  };

  // Delete
  const handleDelete = async () => {
    await deleteDoc(doc(db, 'products', delId));
    setShowDelete(false);
    await fetchProducts();
    window.alert('Produit supprimé définitivement !');
  };

  // —— Render only after auth check passes ——
  if (checkingAuth) return null;

  return (
    <>
      <AppNavbar className="bg-white border-b" />

      <div className="p-6 bg-gray-50 min-h-screen space-y-6">
        {/* Filters & Add */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <TextInput
              placeholder="Rechercher produits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-white"
            />
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="min-w-[200px] bg-white"
            >
              <option value="">Toutes catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <Button
            onClick={() => {
              setCurrentProduct(null);
              setShowAdd(true);
            }}
            color="green"
            className="bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 shadow-sm"
          >
            + Nouveau produit
          </Button>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto bg-white rounded-lg shadow-sm border">
          <Table hoverable className="min-w-full divide-y divide-gray-200">
            <TableHead className="bg-gray-50">
              <TableRow>
                <TableHeadCell>Nom</TableHeadCell>
                <TableHeadCell>Catégorie</TableHeadCell>
                <TableHeadCell>Prix</TableHeadCell>
                <TableHeadCell>Quantité</TableHeadCell>
                <TableHeadCell className="text-right">Actions</TableHeadCell>
              </TableRow>
            </TableHead>
            <FlowTableBody>
              {products
                .filter((p) =>
                  p.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .filter((p) => !filter || p.categoryId === filter)
                .map((p) => (
                  <TableRow
                    key={p.id}
                    className="hover:bg-gray-50 border-b-[1px]"
                  >
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {categories.find((c) => c.id === p.categoryId)?.name ||
                          'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-blue-600">
                      {(p.price || 0).toFixed(2)} DA
                    </TableCell>
                    <TableCell>
                      <Badge
                        color={p.quantity > 0 ? 'green' : 'red'}
                        className="w-fit"
                      >
                        {p.quantity} en stock
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Tooltip content="Vente">
                          <Button
                            color="none"
                            size="xs"
                            className="text-green-600 bg-transparent hover:bg-blue-900"
                            onClick={() => {
                              setCurrentProduct(p);
                              setShowSale(true);
                            }}
                          >
                            <CurrencyDollarIcon className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Récupérer">
                          <Button
                            color="none"
                            size="xs"
                            className="text-purple-500 bg-transparent hover:bg-blue-900"
                            onClick={() => {
                              setCurrentProduct(p);
                              setShowReturn(true);
                            }}
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Modifier">
                          <Button
                            color="none"
                            size="xs"
                            className="text-blue-600 bg-transparent hover:bg-blue-900"
                            onClick={() => openEdit(p)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                        <Tooltip content="Supprimer">
                          <Button
                            color="none"
                            size="xs"
                            className="text-red-600 bg-transparent hover:bg-blue-900"
                            onClick={() => {
                              setDelId(p.id);
                              setShowDelete(true);
                            }}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </FlowTableBody>
          </Table>
        </div>
      </div>

      {/* Modals (unchanged) */}
      <Modal show={showSale} onClose={() => setShowSale(false)}>
        <ModalHeader>Enregistrer une vente</ModalHeader>
        <ModalBody className="space-y-4">
          <div>
            <Label>Quantité vendue</Label>
            <TextInput
              type="number"
              value={transactionData.quantity}
              onChange={(e) =>
                setTransactionData({
                  ...transactionData,
                  quantity: e.target.value,
                })
              }
              min="1"
              max={currentProduct?.quantity}
            />
          </div>
          <div>
            <Label>Prix final</Label>
            <TextInput
              type="number"
              value={transactionData.price}
              onChange={(e) =>
                setTransactionData({
                  ...transactionData,
                  price: e.target.value,
                })
              }
              step="0.01"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setShowSale(false)}>
            Annuler
          </Button>
          <Button color="success" onClick={() => handleTransaction(false)}>
            Confirmer la vente
          </Button>
        </ModalFooter>
      </Modal>

      <Modal show={showReturn} onClose={() => setShowReturn(false)}>
        <ModalHeader>Enregistrer un retour</ModalHeader>
        <ModalBody className="space-y-4">
          <div>
            <Label>Quantité récupérée</Label>
            <TextInput
              type="number"
              value={transactionData.quantity}
              onChange={(e) =>
                setTransactionData({
                  ...transactionData,
                  quantity: e.target.value,
                })
              }
              min="1"
            />
          </div>
          <div>
            <Label>Montant remboursé</Label>
            <TextInput
              type="number"
              value={transactionData.price}
              onChange={(e) =>
                setTransactionData({
                  ...transactionData,
                  price: e.target.value,
                })
              }
              step="0.01"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setShowReturn(false)}>
            Annuler
          </Button>
          <Button color="green" onClick={() => handleTransaction(true)}>
            Confirmer le retour
          </Button>
        </ModalFooter>
      </Modal>

      <Modal show={showDelete} onClose={() => setShowDelete(false)}>
        <ModalHeader>Confirmer la suppression</ModalHeader>
        <ModalBody className="text-center">
          <TrashIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-white mb-4">
            Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.
          </p>
        </ModalBody>
        <ModalFooter className="justify-center">
          <Button color="light" onClick={() => setShowDelete(false)} className="mr-3">
            Annuler
          </Button>
          <Button color="red" onClick={handleDelete}>
            Supprimer définitivement
          </Button>
        </ModalFooter>
      </Modal>

      <Modal show={showAdd} onClose={() => setShowAdd(false)}>
        <ModalHeader>
          {currentProduct ? 'Modifier produit' : 'Nouveau produit'}
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div>
            <Label>Nom du produit</Label>
            <TextInput
              value={input.name}
              onChange={(e) =>
                setInput({ ...input, name: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Catégorie</Label>
            <Select
              value={input.categoryId}
              onChange={(e) =>
                setInput({ ...input, categoryId: e.target.value })
              }
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Prix de vente</Label>
            <TextInput
              type="number"
              step="0.01"
              value={input.price}
              onChange={(e) =>
                setInput({ ...input, price: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Quantité initiale</Label>
            <TextInput
              type="number"
              value={input.quantity}
              onChange={(e) =>
                setInput({ ...input, quantity: e.target.value })
              }
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setShowAdd(false)}>
            Annuler
          </Button>
          <Button color="green" onClick={submitProduct}>
            {currentProduct ? 'Mettre à jour' : 'Créer produit'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
