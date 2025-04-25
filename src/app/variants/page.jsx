'use client';

import { useState, useEffect } from 'react';
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
  Card,
  TextInput,
  Label,
  Tooltip,
} from 'flowbite-react';
import { PencilIcon, TrashIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import AppNavbar from '@/components/AppNavbar';
import { db } from '../../../utils/firebase';

export default function VariantsPage() {
  const storeId = 'akcher';
  const TYPES = {
    COLOR: 'Couleur',
    SIZE: 'Taille',
    SHOE_SIZE: 'Pointure'
  };

  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [pointures, setPointures] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState('add');
  const [currentType, setCurrentType] = useState('');
  const [currentVariant, setCurrentVariant] = useState(null);
  
  // Form states
  const [colorInput, setColorInput] = useState({ name: '', hex: '#000000' });
  const [sizeInput, setSizeInput] = useState({ name: '' });
  const [pointureInput, setPointureInput] = useState({ value: 0 });

  const [showDelete, setShowDelete] = useState(false);
  const [delId, setDelId] = useState('');

  useEffect(() => {
    fetchVariants();
  }, []);

  async function fetchVariants() {
    setLoading(true);
    const q = query(collection(db, 'variants'), where('storeId', '==', storeId));
    const snap = await getDocs(q);
    
    const variants = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setColors(variants.filter(v => v.type === TYPES.COLOR));
    setSizes(variants.filter(v => v.type === TYPES.SIZE));
    setPointures(variants.filter(v => v.type === TYPES.SHOE_SIZE));
    
    setLoading(false);
  }

  const fmtDate = ts => ts?.toDate().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const openAddModal = (type) => {
    setCurrentType(type);
    setMode('add');
    setShowModal(true);
  };

  const openEditModal = (variant) => {
    setCurrentType(variant.type);
    setCurrentVariant(variant);
    setMode('edit');
    
    if(variant.type === TYPES.COLOR) {
      setColorInput({ name: variant.name, hex: variant.hex });
    } else if(variant.type === TYPES.SIZE) {
      setSizeInput({ name: variant.name });
    } else {
      setPointureInput({ value: variant.value });
    }
    
    setShowModal(true);
  };

  const validateInput = () => {
    if(currentType === TYPES.COLOR) {
      return colorInput.name.trim() && colorInput.hex;
    }
    if(currentType === TYPES.SIZE) {
      return sizeInput.name.trim();
    }
    return pointureInput.value > 0;
  };

  const handleSave = async () => {
    if(!validateInput()) return;

    const commonData = {
      storeId,
      type: currentType,
      updatedAt: serverTimestamp(),
    };

    if(mode === 'add') {
      const specificData = currentType === TYPES.COLOR ? {
        name: colorInput.name,
        hex: colorInput.hex,
        createdAt: serverTimestamp(),
      } : currentType === TYPES.SIZE ? {
        name: sizeInput.name,
        createdAt: serverTimestamp(),
      } : {
        value: pointureInput.value,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'variants'), { ...commonData, ...specificData });
    } else {
      const specificData = currentType === TYPES.COLOR ? {
        name: colorInput.name,
        hex: colorInput.hex,
      } : currentType === TYPES.SIZE ? {
        name: sizeInput.name,
      } : {
        value: pointureInput.value,
      };

      await updateDoc(doc(db, 'variants', currentVariant.id), {
        ...commonData,
        ...specificData,
      });
    }

    setShowModal(false);
    fetchVariants();
  };

  async function handleDelete() {
    await deleteDoc(doc(db, 'variants', delId));
    setShowDelete(false);
    fetchVariants();
  }

  const renderSection = (title, type, items, form) => (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        <Button
          size="sm"
          gradientDuoTone="greenToBlue"
          className="shadow-sm bg-[#005D2F] hover:bg-[#004225] text-white"
          onClick={() => openAddModal(type)}
        >
          <PlusCircleIcon className="h-5 w-5 mr-2" />
          Ajouter
        </Button>
      </div>
      
      {form}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map(item => (
          <Card key={item.id} className="hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div className="w-full">
                {type === TYPES.COLOR && (
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-8 h-8 rounded-full shadow-sm border-2 border-white"
                      style={{ backgroundColor: item.hex }}
                    />
                    <div>
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-sm text-white">{item.hex.toUpperCase()}</p>
                    </div>
                  </div>
                )}
                
                {type === TYPES.SIZE && (
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium text-white text-lg">{item.name}</span>
                  </div>
                )}
                
                {type === TYPES.SHOE_SIZE && (
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium text-white text-lg">Pointure {item.value}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 ml-2">
                <Tooltip content="Modifier">
                  <Button
                    size="xs"
                    color="light"
                    onClick={() => openEditModal(item)}
                    className="hover:bg-gray-50"
                  >
                    <PencilIcon className="h-4 w-4 text-blue-500" />
                  </Button>
                </Tooltip>
                <Tooltip content="Supprimer">
                  <Button 
                    size="xs" 
                    color="light"
                    onClick={() => {
                      setDelId(item.id);
                      setShowDelete(true);
                    }}
                    className="hover:bg-gray-50"
                  >
                    <TrashIcon className="h-4 w-4 text-red-600" />
                  </Button>
                </Tooltip>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Créé le {fmtDate(item.createdAt)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <AppNavbar className="bg-[#005D2F]" />

      <div className="container mx-auto p-4 lg:p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Gestion des Variantes</h1>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#005D2F] mx-auto"></div>
            </div>
          ) : (
            <>
              {renderSection(
                'Couleurs',
                TYPES.COLOR,
                colors,
                <div className="mb-6 p-4 bg-white rounded-xl shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="block mb-2 text-sm font-medium text-gray-700">Nom de la couleur</Label>
                      <TextInput
                        placeholder="Ex: Rouge vif"
                        value={colorInput.name}
                        onChange={e => setColorInput({ ...colorInput, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="block mb-2 text-sm font-medium text-gray-700">Sélection de couleur</Label>
                      <div className="flex items-center gap-4">
                        <input
                          type="color"
                          value={colorInput.hex}
                          onChange={e => setColorInput({ ...colorInput, hex: e.target.value })}
                          className="w-12 h-12 cursor-pointer rounded-lg border-2 border-gray-200"
                        />
                        <span className="text-sm text-gray-600">{colorInput.hex.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {renderSection(
                'Tailles',
                TYPES.SIZE,
                sizes,
                <div className="mb-6 p-4 bg-white rounded-xl shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="block mb-2 text-sm font-medium text-gray-700">Nom de la taille</Label>
                      <TextInput
                        placeholder="Ex: XL"
                        value={sizeInput.name}
                        onChange={e => setSizeInput({ ...sizeInput, name: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {renderSection(
                'Pointures',
                TYPES.SHOE_SIZE,
                pointures,
                <div className="mb-6 p-4 bg-white rounded-xl shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="block mb-2 text-sm font-medium text-gray-700">Numéro de pointure</Label>
                      <TextInput
                        type="number"
                        placeholder="Ex: 42.5"
                        min="1"
                        step="0.5"
                        value={pointureInput.value}
                        onChange={e => setPointureInput({ ...pointureInput, value: +e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal show={showModal} onClose={() => setShowModal(false)} size="md" position="top-center">
        <ModalHeader className="border-b-0 pb-0">
          {mode === 'add' ? `Nouvelle ${currentType.toLowerCase()}` : `Modifier ${currentType.toLowerCase()}`}
        </ModalHeader>
        <ModalBody className="pt-4">
          {currentType === TYPES.COLOR && (
            <div className="space-y-6">
              <div>
                <Label className="block mb-2 text-sm font-medium">Nom de la couleur</Label>
                <TextInput
                  value={colorInput.name}
                  onChange={e => setColorInput({ ...colorInput, name: e.target.value })}
                  placeholder="Nom descriptif"
                />
              </div>
              <div>
                <Label className="block mb-2 text-sm font-medium">Couleur</Label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={colorInput.hex}
                    onChange={e => setColorInput({ ...colorInput, hex: e.target.value })}
                    className="w-16 h-16 cursor-pointer rounded-lg border-2 border-gray-200"
                  />
                  <span className="text-sm text-white">{colorInput.hex.toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}

          {currentType === TYPES.SIZE && (
            <div className="space-y-6">
              <div>
                <Label className="block mb-2 text-sm font-medium">Désignation de la taille</Label>
                <TextInput
                  value={sizeInput.name}
                  onChange={e => setSizeInput({ ...sizeInput, name: e.target.value })}
                  placeholder="Ex: L, XL, XXL"
                />
              </div>
            </div>
          )}

          {currentType === TYPES.SHOE_SIZE && (
            <div className="space-y-6">
              <div>
                <Label className="block mb-2 text-sm font-medium">Numéro de pointure</Label>
                <TextInput
                  type="number"
                  min="1"
                  step="0.5"
                  value={pointureInput.value}
                  onChange={e => setPointureInput({ ...pointureInput, value: +e.target.value })}
                  placeholder="Ex: 42.5"
                />
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter className="border-t-0 pt-0">
          <Button
            onClick={handleSave}
            className="w-full justify-center bg-[#005D2F] hover:bg-[#004225] text-white"
          >
            {mode === 'add' ? 'Créer' : 'Mettre à jour'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation */}
      <Modal show={showDelete} size="sm" popup onClose={() => setShowDelete(false)} position="top-center">
        <ModalHeader className="border-b-0" />
        <ModalBody className="text-center py-6">
          <TrashIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Confirmer la suppression</h3>
          <p className="text-white text-sm">Cette action est irréversible</p>
        </ModalBody>
        <ModalFooter className="justify-center gap-4 border-t-0">
          <Button
            color="light"
            onClick={() => setShowDelete(false)}
            className="px-6"
          >
            Annuler
          </Button>
          <Button
            color="failure"
            onClick={handleDelete}
            className="px-6 text-white cursor-pointer hover:bg-gray-900"
          >
            Supprimer
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}