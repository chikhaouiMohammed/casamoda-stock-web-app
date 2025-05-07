// /components/AppNavbar.jsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
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
          Akcher
        </span>
      </NavbarBrand>

      <div className="flex md:order-2">
        <Dropdown
          arrowIcon={false}
          inline
          label={
            <Avatar
              alt="User settings"
              img="/images/akcher_profile_image.jpg"
              rounded
            />
          }
        >
          <DropdownHeader>
            <span className="block text-sm">Amine Chermiti</span>
            <span className="block truncate text-sm font-medium">
              amiechermitti@hotmail.com
            </span>
          </DropdownHeader>
          
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
            className="cursor-pointer"
          >
            {link.name}
          </NavbarLink>
        ))}
      </NavbarCollapse>
    </Navbar>
  );
}


// {/* <DropdownItem href='https://console.firebase.google.com/project/akcher-stock-app/authentication/users' onClick={() => {/* change password */}}>
//             Modifier Mot de Passe
//           </DropdownItem>
//           <DropdownItem onClick={() => router.push('/settings')}>
//             Paramètres
//           </DropdownItem> */}