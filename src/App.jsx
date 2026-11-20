import { lazy, Suspense, useEffect, useState } from 'react';
import { Outlet, Route, Routes, useLocation, useSearchParams } from 'react-router';
import { useAccountSync } from './auth/account';
import RequireUser from './auth/RequireUser';
import { isStoryPath } from './data/products';
import { useCatalogCache } from './data/useCatalog';
import { COLORWAYS_BY_ID, DEFAULT_COLORWAY_ID } from './three/colorways';
import ShopSkeleton from './shop/ShopSkeleton';
import Navbar from './sections/Navbar';
import { ScrollTrigger } from './scroll/gsap';
import { useSmoothScroll } from './scroll/useSmoothScroll';
import { useRouteScroll } from './scroll/useRouteScroll';
import './App.css';

const Stage = lazy(() => import('./stage/Stage'));
const AdminApp = lazy(() => import('./admin/AdminApp'));
const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const Product = lazy(() => import('./pages/Product'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Forgot = lazy(() => import('./pages/Forgot'));
const Reset = lazy(() => import('./pages/Reset'));
const Account = lazy(() => import('./pages/Account'));
const OrderStatus = lazy(() => import('./pages/OrderStatus'));
const NotFound = lazy(() => import('./pages/NotFound'));

const STORAGE_KEY = 'noir-color';

function readInitialColor() {
  try {
    const path = window.location.pathname;
    const onShop = path === '/shop' || path === '/shop/';
    const fromUrl = new URLSearchParams(window.location.search).get('color');
    // /shop?color= is a catalog filter. It must not become the model color.
    if (!onShop && fromUrl && COLORWAYS_BY_ID[fromUrl]) return fromUrl;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && COLORWAYS_BY_ID[saved]) return saved;
  } catch {
    /* storage can be blocked; fall through to the default */
  }
  return DEFAULT_COLORWAY_ID;
}

function RouteFallback() {
  const { pathname } = useLocation();
  if (pathname === '/shop') return <ShopSkeleton />;
  return <p className="sr-only">Loading</p>;
}

function CatalogSync() {
  useCatalogCache();
  return null;
}

function AccountSync() {
  useAccountSync();
  return null;
}

function Shell() {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const [colorId, setColorId] = useState(readInitialColor);
  const story = isStoryPath(pathname);

  useSmoothScroll();
  useRouteScroll(pathname);

  useEffect(() => {
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, colorId);
    } catch {
      /* ignore */
    }
  }, [colorId]);

  // ?color= belongs to the model. The shop owns its own query string,
  // so the model color is not written on /shop.
  useEffect(() => {
    if (!story) return undefined;
    if (params.get('color') === colorId) return undefined;
    const next = new URLSearchParams(params);
    next.set('color', colorId);
    setParams(next, { replace: true });
    return undefined;
  }, [story, colorId, params, setParams]);

  return (
    <>
      <CatalogSync />
      <AccountSync />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <p id="route-announcer" className="sr-only" aria-live="polite" />
      {story && (
        <Suspense fallback={null}>
          <Stage colorId={colorId} />
        </Suspense>
      )}
      <main id="main" className="page">
        <Suspense fallback={<RouteFallback />}>
          <Outlet context={{ colorId, onColorChange: setColorId }} />
        </Suspense>
      </main>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="admin/*"
        element={(
          <Suspense fallback={<p className="admin-boot">Loading admin</p>}>
            <AdminApp />
          </Suspense>
        )}
      />
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="products/:slug" element={<Product />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot" element={<Forgot />} />
        <Route path="reset" element={<Reset />} />
        <Route path="account" element={<RequireUser><Account /></RequireUser>} />
        <Route path="orders" element={<OrderStatus />} />
        <Route path="orders/:orderNumber" element={<OrderStatus />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
