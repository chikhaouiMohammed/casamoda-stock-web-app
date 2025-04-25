// /app/categories/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, query, where, getDocs,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  Button,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Table, TableHead, TableHeadCell,
  TableBody as FlowTableBody, TableRow, TableCell,
  Badge,
  Tooltip,
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
      if (!user) {
        router.replace('/login');
      } else {
        setCheckingAuth(false);
      }
    });
    return unsubscribe;
  }, [router]);

  // —— Original state & logic ——  
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [current, setCurrent] = useState({ id: '', name: '' });
  const [input, setInput] = useState('');
  const [delId, setDelId] = useState('');

  async function load() {
    const storeId = sessionStorage.getItem('storeId') || 'akcher';
    const q = query(
      collection(db, 'categories'),
      where('storeId', '==', storeId)
    );
    const snap = await getDocs(q);
    setCats(snap.docs.map(d => ({ id: d.id, ...d.data() }))); // Added missing closing parenthesis
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const refresh = () => load();

  const handleAdd = async () => {
    if (!input.trim()) return;
    const storeId = sessionStorage.getItem('storeId') || 'akcher';
    await addDoc(collection(db, 'categories'), {
      name: input,
      storeId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setShowAdd(false);
    setInput('');
    refresh();
  };

  const handleEdit = async () => {
    await updateDoc(doc(db, 'categories', current.id), {
      name: input,
      updatedAt: serverTimestamp(),
    });
    setShowEdit(false);
    refresh();
  };

  const handleDelete = async () => {
    await deleteDoc(doc(db, 'categories', delId));
    setShowDel(false);
    refresh();
  };

  const formatDate = ts => ts?.toDate().toLocaleDateString('fr-FR');

  // —— Render only after auth check passes ——
  if (checkingAuth) return null;

  return (
    <>
      <AppNavbar className="bg-white border-b" />

      <div className="p-6 bg-gray-50 min-h-screen space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Gestion des catégories</h1>
          <Button
            onClick={() => setShowAdd(true)}
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
                <TableHeadCell>Créée le</TableHeadCell>
                <TableHeadCell>Modifiée le</TableHeadCell>
                <TableHeadCell className="text-right">Actions</TableHeadCell>
              </TableRow>
            </TableHead>
            <FlowTableBody>
              {cats.map(cat => (
                <TableRow
                  key={cat.id}
                  className="hover:bg-gray-50 border-b-[1px]"
                >
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell>
                    <Badge color="gray" className="w-fit">
                      {formatDate(cat.createdAt) || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge color="gray" className="w-fit">
                      {formatDate(cat.updatedAt) || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Tooltip content="Modifier">
                        <Button
                          color="none"
                          size="xs"
                          className="text-blue-600 bg-transparent hover:bg-blue-900"
                          onClick={() => {
                            setCurrent(cat);
                            setInput(cat.name);
                            setShowEdit(true);
                          }}
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
                            setDelId(cat.id);
                            setShowDel(true);
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

      {/* Modals remain the same as before */}
      {/* Add Modal */}
      <Modal show={showAdd} onClose={() => setShowAdd(false)}>
        <ModalHeader>Nouvelle catégorie</ModalHeader>
        <ModalBody className="space-y-4">
          <div>
            <Label>Nom de la catégorie</Label>
            <TextInput
              placeholder="Entrez le nom de la catégorie"
              value={input}
              onChange={(e) => setInput(e.target.value)}
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
      <Modal show={showEdit} onClose={() => setShowEdit(false)}>
        <ModalHeader>Modifier la catégorie</ModalHeader>
        <ModalBody className="space-y-4">
          <div>
            <Label>Nom de la catégorie</Label>
            <TextInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
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
      <Modal show={showDel} onClose={() => setShowDel(false)}>
        <ModalHeader>Confirmer la suppression</ModalHeader>
        <ModalBody className="text-center">
          <TrashIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-white mb-4">
            Êtes-vous sûr de vouloir supprimer cette catégorie ? Cette action est irréversible.
          </p>
        </ModalBody>
        <ModalFooter className="justify-center">
          <Button color="light" onClick={() => setShowDel(false)} className="mr-3">
            Annuler
          </Button>
          <Button color="red" onClick={handleDelete}>
            Supprimer définitivement
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}