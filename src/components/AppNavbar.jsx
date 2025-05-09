// /components/AppNavbar.jsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import {
  Avatar,
  Dropdown,
  DropdownHeader,
  DropdownItem,
  Navbar,
  NavbarBrand,
  NavbarCollapse,
  NavbarLink,
  NavbarToggle,
} from 'flowbite-react';
import { auth } from '../../utils/firebase';

export default function AppNavbar() {
  const router   = useRouter();
  const pathname = usePathname();

  // State to hold the current user's email
  const [userEmail, setUserEmail] = useState('');

  // Listen for auth state changes to grab current user's email
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user?.email) {
        setUserEmail(user.email);
      } else {
        setUserEmail('');
      }
    });
    return unsubscribe;
  }, []);

  const navLinks = [
    { name: 'Dashboard',    href: '/dashboard'  },
    { name: 'Produits',      href: '/products'   },
    { name: 'Catégories',    href: '/categories' },
    { name: 'Statistiques',  href: '/stock'      },
  ];

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem('storeId');
    router.replace('/login');
  };

  return (
    <Navbar className="bg-[#005D2F] text-white" fluid rounded>
      <NavbarBrand
        className="cursor-pointer"
        onClick={() => router.push('/dashboard')}
      >
        <span className="self-center whitespace-nowrap text-xl font-semibold text-white">
          CasaModa
        </span>
      </NavbarBrand>

      <div className="flex md:order-2">
        <Dropdown
          arrowIcon={false}
          inline
          label={
            <Avatar
              alt="User settings"
              img="/images/CASA_MODA_logo.png"
              rounded
            />
          }
        >
          <DropdownHeader>
            <span className="block text-sm">{userEmail || '—'}</span>
          </DropdownHeader>
          <DropdownItem onClick={() => router.push('/change-password')}>
            Modifier Mot de Passe
          </DropdownItem>
          <DropdownItem onClick={handleLogout}>
            Déconnexion
          </DropdownItem>
        </Dropdown>

        <NavbarToggle />
      </div>

      <NavbarCollapse>
        {navLinks.map((link) => (
          <NavbarLink
            key={link.href}
            onClick={() => router.push(link.href)}
            active={pathname === link.href}
            className={`cursor-pointer text-white hover:text-blue-300 ${
              pathname === link.href ? 'font-semibold underline' : ''
            }`}
          >
            {link.name}
          </NavbarLink>
        ))}
      </NavbarCollapse>
    </Navbar>
  );
}
