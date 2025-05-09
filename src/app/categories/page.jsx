// /app/categories/page.jsx
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
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
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
  TextInput,
  Label,
} from 'flowbite-react';
import AppNavbar from '@/components/AppNavbar';
import { auth, db } from '../../../utils/firebase';

export default function CategoriesPage() {
  const router = useRouter();

  // —— Auth guard ——
  const [checkingAuth, setCheckingAuth] = useState(true);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (!user) router.replace('/login');
      else      setCheckingAuth(false);
    });
    return unsubscribe;
  }, [router]);

  // —— Original + colour state & logic ——
  const [cats, setCats]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAdd, setShowAdd]     = useState(false);
  const [showEdit, setShowEdit]   = useState(false);
  const [showDel, setShowDel]     = useState(false);
  const [current, setCurrent]     = useState({ id:'', name:'', color:'#000000', colorName:'' });
  const [inputName, setInputName] = useState('');
  const [inputColor, setInputColor]       = useState('#000000');
  const [inputColorName, setInputColorName] = useState('');
  const [delId, setDelId]         = useState('');

  // load categories
  async function load() {
    const storeId = sessionStorage.getItem('storeId') || 'akcher';
    const q = query(
      collection(db, 'categories'),
      where('storeId','==',storeId)
    );
    const snap = await getDocs(q);
    setCats(snap.docs.map(d=>({
      id: d.id,
      name: d.data().name,
      color: d.data().color || '#000000',
      colorName: d.data().colorName || '',
      createdAt: d.data().createdAt,
      updatedAt: d.data().updatedAt,
    })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const refresh = () => load();

  const handleAdd = async () => {
    if (!inputName.trim()) return;
    const storeId = sessionStorage.getItem('storeId') || 'akcher';
    await addDoc(collection(db, 'categories'), {
      name:      inputName,
      color:     inputColor,
      colorName: inputColorName.trim(),
      storeId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setShowAdd(false);
    setInputName('');
    setInputColor('#000000');
    setInputColorName('');
    refresh();
  };

  const handleEdit = async () => {
    await updateDoc(doc(db,'categories',current.id), {
      name:      inputName,
      color:     inputColor,
      colorName: inputColorName.trim(),
      updatedAt: serverTimestamp(),
    });
    setShowEdit(false);
    refresh();
  };

  const handleDelete = async () => {
    await deleteDoc(doc(db,'categories',delId));
    setShowDel(false);
    refresh();
  };

  const formatDate = ts =>
    ts?.toDate().toLocaleDateString('fr-FR');

  // —— Render only after auth check passes ——
  if (checkingAuth) return null;

  return (
    <>
      <AppNavbar className="bg-white border-b" />

      <div className="p-6 bg-gray-50 min-h-screen space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Gestion des catégories
          </h1>
          <Button
            onClick={() => {
              setCurrent({ id:'', name:'', color:'#000000', colorName:'' });
              setInputName('');
              setInputColor('#000000');
              setInputColorName('');
              setShowAdd(true);
            }}
            color="green"
            className="bg-white text-gray-900 hover:bg-gray-50 border border-gray-200 shadow-sm"
          >
            + Nouvelle catégorie
          </Button>
        </div>

        {/* Categories Table */}
        <div className="overflow-x-auto bg-white rounded-lg shadow-sm border">
          <Table hoverable className="min-w-full divide-y divide-gray-200">
            <TableHead className="bg-gray-50">
              <TableRow>
                <TableHeadCell>Nom</TableHeadCell>
                <TableHeadCell>Couleur</TableHeadCell>
                <TableHeadCell>Créée le</TableHeadCell>
                <TableHeadCell>Modifiée le</TableHeadCell>
                <TableHeadCell className="text-right">Actions</TableHeadCell>
              </TableRow>
            </TableHead>
            <FlowTableBody>
              {cats.map(cat => (
                <TableRow key={cat.id} className="hover:bg-gray-50 border-b-[1px]">
                  <TableCell className="font-medium">
                    {cat.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: cat.color }}
                        title={cat.colorName || cat.color}
                      />
                      <span className="text-sm text-gray-700">
                        {cat.colorName || cat.color}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(cat.createdAt) || 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(cat.updatedAt) || 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="xs"
                        color="white"
                        className=' cursor-pointer'
                        onClick={() => {
                          setCurrent(cat);
                          setInputName(cat.name);
                          setInputColor(cat.color);
                          setInputColorName(cat.colorName);
                          setShowEdit(true);
                        }}
                      >
                        <PencilIcon className="h-4 w-4 text-blue-800" />
                      </Button>
                      <Button
                        size="xs"
                        color="white"
                        className=' cursor-pointer'
                        onClick={() => {
                          setDelId(cat.id);
                          setShowDel(true);
                        }}
                      >
                        <TrashIcon className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </FlowTableBody>
          </Table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal show={showAdd} size="md" onClose={() => setShowAdd(false)}>
        <ModalHeader>Nouvelle catégorie</ModalHeader>
        <ModalBody className="space-y-4">
          <div>
            <Label htmlFor="catColor" className="block text-gray-700">
              Couleur
            </Label>
            <input
              id="catColor"
              type="color"
              value={inputColor}
              onChange={e => setInputColor(e.target.value)}
              className="w-10 h-10 p-0 border-none bg-transparent"
            />
            <TextInput
              placeholder="Nom de la couleur (ex : Rouge)"
              value={inputColorName}
              onChange={e => setInputColorName(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="catName" className="block text-gray-700">
              Nom de la catégorie
            </Label>
            <TextInput
              id="catName"
              placeholder="Entrez le nom"
              value={inputName}
              onChange={e => setInputName(e.target.value)}
              className="mt-1"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setShowAdd(false)}>
            Annuler
          </Button>
          <Button color="green" onClick={handleAdd}>
            Créer
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEdit} size="md" onClose={() => setShowEdit(false)}>
        <ModalHeader>Modifier la catégorie</ModalHeader>
        <ModalBody className="space-y-4">
          <div>
            <Label htmlFor="editColor" className="block text-gray-700">
              Couleur
            </Label>
            <input
              id="editColor"
              type="color"
              value={inputColor}
              onChange={e => setInputColor(e.target.value)}
              className="w-10 h-10 p-0 border-none bg-transparent"
            />
            <TextInput
              placeholder="Nom de la couleur"
              value={inputColorName}
              onChange={e => setInputColorName(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="editName" className="block text-gray-700">
              Nom de la catégorie
            </Label>
            <TextInput
              id="editName"
              value={inputName}
              onChange={e => setInputName(e.target.value)}
              className="mt-1"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setShowEdit(false)}>
            Annuler
          </Button>
          <Button color="green" onClick={handleEdit}>
            Mettre à jour
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation */}
      <Modal show={showDel} size="sm" popup onClose={() => setShowDel(false)}>
        <ModalHeader />
        <ModalBody>
          <div className="text-center text-gray-900">
            Voulez-vous vraiment supprimer cette catégorie ?
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setShowDel(false)}>
            Annuler
          </Button>
          <Button color="failure" onClick={handleDelete}>
            Supprimer
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
