"use client";

import { Button } from "@/components/ui/button";
import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import logo from "@/public/chatWithPdf.png";
import Image from "next/image";
import { IoLogoApple } from "react-icons/io5";
import { IoLogoGoogle } from "react-icons/io";

export default function SignInPage() {
  return (
    <div className="flex-1 overflow-scroll bg-gradient-to-bl from-white to-indigo-600">
      <SignIn.Root>
        <SignIn.Step
          name="start"
          className="flex min-h-screen items-center justify-center"
        >
          <div className="bg-white p-8 rounded-xl drop-shadow-xl shadow-lg max-w-sm w-full">
            <header className="flex flex-col items-center mb-6">
              <Image
                src={logo}
                alt="logo"
                height={2000}
                width={1875}
                className="h-36 w-36 mb-2"
              />
            </header>

            <Clerk.GlobalError className="block text-sm text-red-500 mb-4" />

            <div className="space-y-4">
              <Clerk.Connection name="google" className="w-full">
                <Button className="space-x-2 w-full bg-blue-500 text-white hover:bg-blue-600 focus:ring-4 focus:ring-blue-300">
                  <IoLogoGoogle /> <span>Continue with Google </span>
                </Button>
              </Clerk.Connection>
              <Clerk.Connection name="apple" className="w-full">
                <Button className="space-x-2 w-full bg-black text-white hover:bg-gray-800 focus:ring-4 focus:ring-gray-500">
                  <IoLogoApple /> <span>Continue with Apple </span>
                </Button>
              </Clerk.Connection>
            </div>
          </div>
        </SignIn.Step>
      </SignIn.Root>
    </div>
  );
}
