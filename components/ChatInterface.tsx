"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface ChatProps {
  onLocationsUpdate: (locations: Location[]) => void;
}

export default function ChatInterface({
  onLocationsUpdate,
}: ChatProps) {
  const [messages, setMessages] = useState<{ text: string; sender: "user" | "bot" }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const extractLocations = async (text: string): Promise<Location[]> => {
    const addressRegex = /Address: (.*?)(?:\n|$)/g;
    const locations: Location[] = [];
    let match;
  
    while ((match = addressRegex.exec(text)) !== null) {
      const address = match[1];
      try {
        // Use a geocoding API to get exact coordinates
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            address
          )}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();
  
        if (data.results && data.results.length > 0) {
          const { lat, lng } = data.results[0].geometry.location;
          locations.push({ lat, lng, address });
        } else {
          console.error(`Could not geocode address: ${address}`);
        }
      } catch (error) {
        console.error("Error fetching geocode data:", error);
      }
    }
  
    return locations;
  };
  

  const handleSendMessage = async () => {
    if (input.trim()) {
      setMessages((prev) => [...prev, { text: input, sender: "user" }]);
      setIsLoading(true);
      try {
        console.log("Sending request to chatbot API:", input);
        const startTime = Date.now();
        const response = await fetch("/api/chatbot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userRequirements: input }),
        });
        const data = await response.json();
        const endTime = Date.now();
        console.log("Received response from chatbot API:", data);
        console.log("Response time:", endTime - startTime, "ms");
        setMessages((prev) => [
          ...prev,
          { text: data.response, sender: "bot" },
        ]);

        // Extract locations and update the map
        const locations = await extractLocations(data.response);
        onLocationsUpdate(locations);
      } catch (error) {
        console.error("Error:", error);
        setMessages((prev) => [
          ...prev,
          {
            text: "Sorry, an error occurred. Please try again.",
            sender: "bot",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-full">
    <div className="p-4 bg-gray-100 border-b">
    <h1 className="text-lg font-semibold text-black-100 text-center">
      Chatbot is searching for houses in LA
    </h1>
    </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`${
              message.sender === "user" ? "text-right" : "text-left"
            }`}
          >
            <span
              className={`inline-block p-2 rounded-lg whitespace-pre-line ${
                message.sender === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              {message.text}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="text-center">
            <span className="inline-block p-2 rounded-lg bg-gray-200 text-gray-800">
              Thinking...
            </span>
          </div>
        )}
      </div>
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type your rental requirements..."
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={isLoading}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
