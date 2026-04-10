import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { getAdminProducts } from "@/lib/productCatalog";
import AdminProducts from "@/components/Admin/AdminProducts";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | Zanesville Store",
  description: "Manage inventory, pricing, and sold items.",
};

const AdminPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/signin?callbackUrl=/admin");
  }

  if (!isAdminEmail(session.user.email)) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center bg-gray-2 py-20">
        <div className="max-w-md text-center px-6">
          <h1 className="text-2xl font-semibold text-dark mb-3">
            Admin only
          </h1>
          <p className="text-dark-4">
            You&apos;re signed in as {session.user.email}, but this area is
            restricted to Jordan.
          </p>
        </div>
      </main>
    );
  }

  const products = await getAdminProducts("all");

  return (
    <main className="bg-gray-2 py-14 xl:py-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 xl:px-10">
        <header className="mb-8">
          <p className="text-sm uppercase tracking-wide text-dark-4">
            Admin panel
          </p>
          <h1 className="text-3xl font-semibold text-dark mt-1">
            Inventory Management
          </h1>
          <p className="text-dark-4 mt-2 max-w-2xl">
            Update titles, prices, and MSRPs, or mark items as sold. Items
            marked sold move to the{" "}
            <a href="/sold" className="text-blue hover:underline">
              Recently Sold
            </a>{" "}
            page and are removed from the active shop.
          </p>
        </header>

        <AdminProducts initialProducts={products} />
      </div>
    </main>
  );
};

export default AdminPage;
