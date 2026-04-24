"use client";

import React, { useState } from "react";
import Breadcrumb from "../Common/Breadcrumb";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; note?: string }
  | { status: "error"; message: string };

const INITIAL_FORM: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

const INPUT_CLASS =
  "rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full py-2.5 px-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20";

const Contact = () => {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });

  const updateField =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmit({ status: "submitting" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as {
        success: boolean;
        error?: string;
        note?: string;
      };

      if (!response.ok || !payload.success) {
        setSubmit({
          status: "error",
          message: payload.error ?? "Something went wrong. Please try again.",
        });
        return;
      }

      setSubmit({ status: "success", note: payload.note });
      setForm(INITIAL_FORM);
    } catch {
      setSubmit({
        status: "error",
        message: "Network error. Please try again or call directly.",
      });
    }
  };

  return (
    <>
      <Breadcrumb title={"Contact"} pages={["contact"]} />

      <section className="overflow-hidden py-20 bg-gray-2">
        <div className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0">
          <div className="flex flex-col xl:flex-row gap-7.5">
            <div className="xl:max-w-[370px] w-full bg-white rounded-xl shadow-1">
              <div className="py-5 px-4 sm:px-7.5 border-b border-gray-3">
                <p className="font-medium text-xl text-dark">
                  Contact Information
                </p>
              </div>

              <div className="p-4 sm:p-7.5">
                <div className="flex flex-col gap-4 text-dark">
                  <p className="flex items-center gap-3">
                    <span className="font-semibold w-20">Name:</span>
                    <span>Jordan Lang</span>
                  </p>

                  <p className="flex items-center gap-3">
                    <span className="font-semibold w-20">Phone:</span>
                    <a
                      href="tel:+17406472461"
                      className="text-blue hover:underline"
                    >
                      (740) 647-2461
                    </a>
                  </p>

                  <p className="flex items-center gap-3">
                    <span className="font-semibold w-20">Email:</span>
                    <a
                      href="mailto:jordan@Jlang.dev"
                      className="text-blue hover:underline break-all"
                    >
                      jordan@Jlang.dev
                    </a>
                  </p>

                  <p className="flex gap-3">
                    <span className="font-semibold w-20 shrink-0">
                      Address:
                    </span>
                    <span>
                      2010 Beechrock Circle, Apt B
                      <br />
                      Zanesville, OH 43701
                    </span>
                  </p>
                </div>

                <div className="mt-7.5 flex flex-col gap-3">
                  <a
                    href="tel:+17406472461"
                    className="w-full inline-flex items-center justify-center gap-2 font-medium text-white bg-blue py-3 px-5 rounded-md ease-out duration-200 hover:bg-blue-dark"
                  >
                    Call Now: (740) 647-2461
                  </a>
                  <a
                    href="mailto:jordan@Jlang.dev"
                    className="w-full inline-flex items-center justify-center gap-2 font-medium text-dark bg-gray-1 border border-gray-3 py-3 px-5 rounded-md ease-out duration-200 hover:bg-gray-2"
                  >
                    Email Jordan
                  </a>
                </div>
              </div>
            </div>

            <div className="xl:max-w-[770px] w-full bg-white rounded-xl shadow-1 p-4 sm:p-7.5 xl:p-10">
              <div className="mb-6 p-4 rounded-md border border-blue/20 bg-blue/5 text-dark-4 text-sm">
                Heads up: this site is a personal inventory showcase. Prices
                are accurate, but online checkout is not connected to a
                payment processor. The fastest way to buy something is to
                send a message below or call directly.
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="flex flex-col lg:flex-row gap-5 sm:gap-8 mb-5">
                  <div className="w-full">
                    <label htmlFor="firstName" className="block mb-2.5">
                      First Name <span className="text-red">*</span>
                    </label>

                    <input
                      type="text"
                      name="firstName"
                      id="firstName"
                      required
                      value={form.firstName}
                      onChange={updateField("firstName")}
                      placeholder="Jane"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div className="w-full">
                    <label htmlFor="lastName" className="block mb-2.5">
                      Last Name <span className="text-red">*</span>
                    </label>

                    <input
                      type="text"
                      name="lastName"
                      id="lastName"
                      required
                      value={form.lastName}
                      onChange={updateField("lastName")}
                      placeholder="Doe"
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-5 sm:gap-8 mb-5">
                  <div className="w-full">
                    <label htmlFor="email" className="block mb-2.5">
                      Email <span className="text-red">*</span>
                    </label>

                    <input
                      type="email"
                      name="email"
                      id="email"
                      required
                      value={form.email}
                      onChange={updateField("email")}
                      placeholder="you@example.com"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div className="w-full">
                    <label htmlFor="phone" className="block mb-2.5">
                      Phone
                    </label>

                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      value={form.phone}
                      onChange={updateField("phone")}
                      placeholder="(optional)"
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="mb-5">
                  <label htmlFor="subject" className="block mb-2.5">
                    Subject
                  </label>

                  <input
                    type="text"
                    name="subject"
                    id="subject"
                    value={form.subject}
                    onChange={updateField("subject")}
                    placeholder="What are you interested in?"
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="mb-7.5">
                  <label htmlFor="message" className="block mb-2.5">
                    Message <span className="text-red">*</span>
                  </label>

                  <textarea
                    name="message"
                    id="message"
                    rows={5}
                    required
                    value={form.message}
                    onChange={updateField("message")}
                    placeholder="Tell Jordan which items you're interested in..."
                    className="rounded-md border border-gray-3 bg-gray-1 placeholder:text-dark-5 w-full p-5 outline-none duration-200 focus:border-transparent focus:shadow-input focus:ring-2 focus:ring-blue/20"
                  />
                </div>

                {submit.status === "success" && (
                  <div className="mb-5 p-4 rounded-md border border-green/30 bg-green/10 text-dark">
                    Thanks! Your message was received.{" "}
                    {submit.note ?? "Jordan will get back to you shortly."}
                  </div>
                )}

                {submit.status === "error" && (
                  <div className="mb-5 p-4 rounded-md border border-red/30 bg-red/10 text-red">
                    {submit.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submit.status === "submitting"}
                  className="inline-flex font-medium text-white bg-blue py-3 px-7 rounded-md ease-out duration-200 hover:bg-blue-dark disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submit.status === "submitting"
                    ? "Sending..."
                    : "Send Message"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Contact;
