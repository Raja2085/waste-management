"use client";

import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useState } from "react";

const containerStyle = {
  width: "100%",
  height: "300px",
};

type AddressInfo = {
  fullAddress: string;
  state: string;
  district: string;
  locality: string; // 👈 current location (city/area)
};

export default function Map() {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [address, setAddress] = useState<AddressInfo | null>(null);

  /* ---------- GET CURRENT LOCATION ---------- */
  useEffect(() => {
    if (!navigator.geolocation) {
      const fallback = { lat: 13.0827, lng: 80.2707 };
      setLocation(fallback);
      reverseGeocode(fallback.lat, fallback.lng);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setLocation(coords);
        reverseGeocode(coords.lat, coords.lng);
      },
      () => {
        const fallback = { lat: 13.0827, lng: 80.2707 };
        setLocation(fallback);
        reverseGeocode(fallback.lat, fallback.lng);
      }
    );
  }, []);

  /* ---------- REVERSE GEOCODE ---------- */
  const reverseGeocode = (lat: number, lng: number) => {
    if (!window.google) return;

    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode(
      { location: { lat, lng } },
      (results, status) => {
        if (status === "OK" && results && results.length > 0) {
          const components = results[0].address_components;

          let state = "";
          let district = "";
          let locality = "";

          components.forEach((c) => {
            if (c.types.includes("locality")) {
              locality = c.long_name;
            }
            if (c.types.includes("administrative_area_level_2")) {
              district = c.long_name;
            }
            if (c.types.includes("administrative_area_level_1")) {
              state = c.long_name;
            }
          });

          setAddress({
            fullAddress: results[0].formatted_address,
            state,
            district,
            locality,
          });
        }
      }
    );
  };

  /* ---------- GUARD ---------- */
  if (!isLoaded || !location) {
    return (
      <div className="flex items-center justify-center h-40">
        Loading map...
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* MAP */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={location}
        zoom={14}
      >
        <Marker position={location} />
      </GoogleMap>

      {/* LOCATION DETAILS */}
      {address && (
        <div className="bg-white border rounded-lg p-3 text-sm text-black space-y-1">
          <p>
            <b>Current Location:</b>{" "}
            {address.locality || "Unknown"}
          </p>
          <p>
            <b>District:</b>{" "}
            {address.district || "N/A"}
          </p>
          <p>
            <b>State:</b>{" "}
            {address.state || "N/A"}
          </p>
          <p>
            <b>Address:</b>{" "}
            {address.fullAddress}
          </p>
        </div>
      )}
    </div>
  );
}
