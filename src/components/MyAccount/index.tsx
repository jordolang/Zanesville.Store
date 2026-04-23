"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";
import Breadcrumb from "@/components/Common/Breadcrumb";

export interface MyAccountUser {
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  isAdmin: boolean;
}

interface MyAccountProps {
  user: MyAccountUser;
}

type Tab = "overview" | "password";

const MyAccount: React.FC<MyAccountProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        toast.error(data.error ?? "Could not update password.");
        return;
      }
      toast.success("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Network error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = user.name?.trim() || user.email.split("@")[0];

  return (
    <>
      <Breadcrumb title="My Account" pages={["My Account"]} />

      <section className="overflow-hidden py-14 xl:py-20 bg-gray-2">
        <div className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-[260px] shrink-0">
              <div className="bg-white rounded-xl shadow-1 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-blue/10 text-blue flex items-center justify-center font-semibold text-lg uppercase">
                    {displayName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-dark truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-dark-4 truncate">{user.email}</p>
                  </div>
                </div>

                <nav className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className={`text-left px-3 py-2 rounded-md text-sm font-medium transition ${
                      activeTab === "overview"
                        ? "bg-blue text-white"
                        : "text-dark hover:bg-gray-1"
                    }`}
                  >
                    Account overview
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("password")}
                    className={`text-left px-3 py-2 rounded-md text-sm font-medium transition ${
                      activeTab === "password"
                        ? "bg-blue text-white"
                        : "text-dark hover:bg-gray-1"
                    }`}
                  >
                    Change password
                  </button>
                  {user.isAdmin && (
                    <Link
                      href="/admin"
                      className="text-left px-3 py-2 rounded-md text-sm font-medium text-dark hover:bg-gray-1"
                    >
                      Admin panel →
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-left px-3 py-2 rounded-md text-sm font-medium text-red hover:bg-red/5"
                  >
                    Sign out
                  </button>
                </nav>
              </div>
            </aside>

            <div className="flex-1">
              {activeTab === "overview" && (
                <div className="bg-white rounded-xl shadow-1 p-6 sm:p-8">
                  <h1 className="text-2xl font-semibold text-dark">
                    Welcome back, {displayName}
                  </h1>
                  <p className="text-dark-4 mt-2">
                    You&apos;re signed in with the following account. Use the
                    menu to change your password or sign out.
                  </p>

                  <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-dark-4">
                        Name
                      </dt>
                      <dd className="mt-1 text-dark">
                        {user.name?.trim() || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-dark-4">
                        Email
                      </dt>
                      <dd className="mt-1 text-dark">{user.email}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-dark-4">
                        Role
                      </dt>
                      <dd className="mt-1 text-dark capitalize">
                        {user.role}
                        {user.isAdmin && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue/10 text-blue">
                            Admin
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {user.isAdmin && (
                    <div className="mt-8 p-4 rounded-lg bg-blue/5 border border-blue/20">
                      <p className="text-dark font-medium">
                        You have admin access.
                      </p>
                      <p className="text-dark-4 text-sm mt-1">
                        Manage inventory, photos, pricing, and descriptions
                        from the admin panel.
                      </p>
                      <Link
                        href="/admin"
                        className="inline-block mt-3 px-4 py-2 rounded-md bg-blue text-white text-sm font-medium hover:bg-blue-dark"
                      >
                        Open admin panel
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "password" && (
                <div className="bg-white rounded-xl shadow-1 p-6 sm:p-8 max-w-[560px]">
                  <h1 className="text-2xl font-semibold text-dark mb-2">
                    Change password
                  </h1>
                  <p className="text-dark-4 mb-6">
                    Enter your current password, then choose a new one (at
                    least 8 characters).
                  </p>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label
                        htmlFor="currentPassword"
                        className="block mb-2 text-sm font-medium text-dark"
                      >
                        Current password
                      </label>
                      <input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full rounded-lg border border-gray-3 bg-gray-1 py-3 px-5 outline-none focus:border-transparent focus:ring-2 focus:ring-blue/20"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="newPassword"
                        className="block mb-2 text-sm font-medium text-dark"
                      >
                        New password
                      </label>
                      <input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-lg border border-gray-3 bg-gray-1 py-3 px-5 outline-none focus:border-transparent focus:ring-2 focus:ring-blue/20"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="block mb-2 text-sm font-medium text-dark"
                      >
                        Confirm new password
                      </label>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-lg border border-gray-3 bg-gray-1 py-3 px-5 outline-none focus:border-transparent focus:ring-2 focus:ring-blue/20"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex justify-center font-medium text-white bg-dark py-3 px-6 rounded-lg ease-out duration-200 hover:bg-blue disabled:opacity-50"
                    >
                      {isSubmitting ? "Updating..." : "Update password"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default MyAccount;
