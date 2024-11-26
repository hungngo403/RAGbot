"use client";
import { useState } from "react";
import MapComponent from "@/components/MapComponent";
import ChatInterface, { Location } from "@/components/ChatInterface";

export default function Home() {
  const [locations, setLocations] = useState<Location[]>([]);

  // This function is passed to ChatInterface to update the locations
  const handleLocationsUpdate = (newLocations: Location[]) => {
    setLocations(newLocations);
  };

  return (
    <main className="flex flex-col md:flex-row h-screen">
      <div className="w-full md:w-1/2 h-1/2 md:h-full">
        <MapComponent locations={locations} />
      </div>
      <div className="w-full md:w-1/2 h-1/2 md:h-full">
        <ChatInterface onLocationsUpdate={handleLocationsUpdate} />
      </div>
    </main>
  );
}
