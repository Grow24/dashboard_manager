// components/ui/Tabs.tsx
"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileCard from "@/components/ProfileCard";
import InfoCard from "@/components/InfoCard";
import MyPopup from "@/components/MyPopup";

const CustomTabs = () => {
  return (
    <div className="w-full max-w-2xl mx-auto mt-6">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="flex justify-center space-x-4 bg-white p-2 rounded-xl shadow">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="popup">Popup</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileCard />
        </TabsContent>

        <TabsContent value="info" className="mt-6">
          <InfoCard />
        </TabsContent>

        <TabsContent value="popup" className="mt-6">
          <MyPopup />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomTabs;
