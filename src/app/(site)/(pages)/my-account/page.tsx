import MyAccount from "@/components/MyAccount";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, isAdminEmail } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Account | Zanesville Store",
  description: "Manage your Zanesville Store account.",
};

const MyAccountPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/signin?callbackUrl=/my-account");
  }

  return (
    <main>
      <MyAccount
        user={{
          name: session.user.name ?? null,
          email: session.user.email,
          image: session.user.image ?? null,
          role: (session.user as { role?: string }).role ?? "user",
          isAdmin: isAdminEmail(session.user.email),
        }}
      />
    </main>
  );
};

export default MyAccountPage;
