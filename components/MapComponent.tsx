"use client"; // Ensure this is a client-side component

import { useMemo, useState, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { Location } from "@/components/ChatInterface";

interface MapComponentProps {
  locations: Location[]; // List of locations passed from ChatInterface
}

const containerStyle = {
  width: "100%",
  height: "100%",
};


const MapComponent = ({ locations }: MapComponentProps) => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const center = useMemo(() => {
    if (!locations || locations.length === 0) {
      return {
        lat: 34.05019727224824, // Default to New York
        lng: -118.27583629343626, // Default to New York
      };
    } else {
      return {
        lat: locations[0].lat,
        lng: locations[0].lng,
      };
    }
  }, [locations]);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "", // Your API key here
  });

  const [, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      if (locations && locations.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        locations.forEach((location) => {
          bounds.extend({ lat: location.lat, lng: location.lng });
        });
        map.fitBounds(bounds); // Only fit bounds when locations exist
      }
      setMap(map);
    },
    [locations]
  );

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={locations.length > 0 ? undefined : center} // Use `center` only when no locations
      zoom={locations.length > 0 ? undefined : 10} // Default zoom for New York when no locations
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={() => setSelectedLocation(null)}
    >
      {locations.map((location, index) => (
        <Marker
          key={index}
          position={{ lat: location.lat, lng: location.lng }}
          title={location.address}
          onClick={() => setSelectedLocation(location)} // Set the clicked location
        />
      ))}

      {selectedLocation && (
        <InfoWindow
          position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
          onCloseClick={() => setSelectedLocation(null)} // Close the info window
        >
          <div>
            <h3>{selectedLocation.address}</h3>
            <p>Latitude: {selectedLocation.lat}</p>
            <p>Longitude: {selectedLocation.lng}</p>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

export default MapComponent;
