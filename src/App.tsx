import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AppLayout from "./components/app-layout.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import SignInPage from "./pages/auth/SignIn.tsx";
import ResetPasswordPage from "./pages/auth/ResetPassword.tsx";
import Index from "./pages/Index.tsx";
import BrowsePage from "./pages/browse/page.tsx";
import ListingPage from "./pages/listing/page.tsx";
import EditListingPage from "./pages/listing/edit/page.tsx";
import SellPage from "./pages/sell/page.tsx";
import { MyShopPage, SellerPage } from "./pages/seller/page.tsx";
import MessagesPage from "./pages/messages/page.tsx";
import AuctionsPage from "./pages/auctions/page.tsx";
import PricingPage from "./pages/pricing/page.tsx";
import AdminPage from "./pages/admin/page.tsx";
import CommunityPage from "./pages/community/page.tsx";
import ThreadPage from "./pages/community/thread/page.tsx";
import FeedPage from "./pages/feed/page.tsx";
import FavoritesPage from "./pages/favorites/page.tsx";
import MyListingsPage from "./pages/my-listings/page.tsx";
import OrdersPage from "./pages/orders/page.tsx";
import CustomsPage from "./pages/customs/page.tsx";
import SettingsPage from "./pages/settings/page.tsx";
import NotFound from "./pages/NotFound.tsx";

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/reset" element={<ResetPasswordPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/following" element={<FeedPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/auctions" element={<AuctionsPage />} />
            <Route path="/listing/:listingId" element={<ListingPage />} />
            <Route
              path="/listing/:listingId/edit"
              element={<EditListingPage />}
            />
            <Route path="/sell" element={<SellPage />} />
            <Route path="/shop" element={<MyShopPage />} />
            <Route path="/seller/:sellerId" element={<SellerPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/community/:threadId" element={<ThreadPage />} />
            <Route path="/my-listings" element={<MyListingsPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/customs" element={<CustomsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="/settings/seller"
              element={<SettingsPage kind="seller" />}
            />
            <Route
              path="/settings/buyer"
              element={<SettingsPage kind="buyer" />}
            />
            <Route path="/messages" element={<MessagesPage />} />
            <Route
              path="/messages/:conversationId"
              element={<MessagesPage />}
            />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
