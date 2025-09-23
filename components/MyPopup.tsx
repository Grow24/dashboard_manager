// components/MyPopup.tsx or .jsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export default function MyPopup() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open Tabbed Popup</Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="account">User Form</TabsTrigger>
            <TabsTrigger value="settings">Contact Form</TabsTrigger>
            <TabsTrigger value="feedback">Feedback Form</TabsTrigger>

          </TabsList>

          <TabsContent value="account">
            {/* <h3 className="text-lg font-semibold mb-2">Account Info</h3> */}
            
            <form className="space-y-4">
      <h2 className="text-2xl font-semibold text-blue-600">User Form</h2>
      <input
        type="text"
        placeholder="Name"
        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <input
        type="email"
        placeholder="Email"
        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg transition-all"
      >
        Submit
      </button>
    </form>
          </TabsContent>

          <TabsContent value="settings">
            {/* <h3 className="text-lg font-semibold mb-2">Settings</h3> */}
           
            <form className="space-y-4">
        <h2 className="text-2xl font-semibold text-green-600">Contact Form</h2>
        <input
          type="text"
          placeholder="Subject"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <textarea
          placeholder="Message"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
          rows={4}
        />
        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg transition-all"
        >
          Send
        </button>
      </form>
          </TabsContent>

          <TabsContent value="feedback">
            {/* <h3 className="text-lg font-semibold mb-2">Account Info</h3> */}
          
            <form className="space-y-4">
        <h2 className="text-2xl font-semibold text-purple-600">Feedback Form</h2>
        <textarea
          placeholder="Your feedback"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
          rows={5}
        />
        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded-lg transition-all"
        >
          Submit
        </button>
      </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
