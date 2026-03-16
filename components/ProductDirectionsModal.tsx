"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker } from "@react-google-maps/api";
import { X, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const containerStyle = {
  width: "100%",
  height: "100%",
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  destinationAddress: string;
};

export default function ProductDirectionsModal({ isOpen, onClose, destinationAddress }: Props) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationLatLng, setDestinationLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");

  const mapRef = useRef<google.maps.Map | null>(null);

  // 1. Get User Location
  useEffect(() => {
    if (isOpen && !currentLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCurrentLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
            setErrorMsg("");
          },
          () => setErrorMsg("Could not get your current location. Please ensure location services are enabled.")
        );
      } else {
        setErrorMsg("Geolocation is not supported by your browser.");
      }
    }
  }, [isOpen, currentLocation]);

  // 2. Geocode Destination Address
  useEffect(() => {
    if (!isLoaded || !isOpen || !destinationAddress || !window.google || destinationLatLng) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: destinationAddress + ", India" }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        setDestinationLatLng({
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
        });
      } else {
        // Fallback: try parsing address to just use the last two parts (District, State)
        const parts = destinationAddress.split(",");
        if (parts.length > 1) {
          const fallbackAddress = parts.slice(-2).join(", ") + ", India";
          geocoder.geocode({ address: fallbackAddress }, (fbResults, fbStatus) => {
             if (fbStatus === "OK" && fbResults && fbResults[0]) {
                 setDestinationLatLng({
                    lat: fbResults[0].geometry.location.lat(),
                    lng: fbResults[0].geometry.location.lng(),
                 });
                 setWarningMsg("Exact address not found. Showing approximate region.");
             } else {
                 setErrorMsg("Could not locate the product address on the map.");
             }
          });
        } else {
           setErrorMsg("Could not locate the product address on the map.");
        }
      }
    });
  }, [isLoaded, isOpen, destinationAddress, destinationLatLng]);

  // 3. Fetch Driving Directions
  const fetchDirections = useCallback(() => {
    if (!currentLocation || !destinationLatLng || !window.google) return;

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: currentLocation,
        destination: destinationLatLng,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          setWarningMsg(""); // Clear warning if we found a route
        } else {
          setWarningMsg("Could not find a driving route. Showing direct markers instead.");
        }
      }
    );
  }, [currentLocation, destinationLatLng]);

  useEffect(() => {
    if (isLoaded && currentLocation && destinationLatLng && isOpen) {
        fetchDirections();
    }
  }, [isLoaded, currentLocation, destinationLatLng, isOpen, fetchDirections]);

  // Handle map bounds when no directions but we have both points
  useEffect(() => {
      if (mapRef.current && currentLocation && destinationLatLng && !directions) {
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend(currentLocation);
          bounds.extend(destinationLatLng);
          mapRef.current.fitBounds(bounds);
      }
  }, [currentLocation, destinationLatLng, directions]);

  // Reset state when closed
  useEffect(() => {
      if (!isOpen) {
          setDirections(null);
          setDestinationLatLng(null);
          setErrorMsg("");
          setWarningMsg("");
      }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center text-foreground">
                    <Navigation size={20} />
                </div>
                <div>
                    <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100 leading-tight">Directions to Product</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px] md:max-w-md truncate" title={destinationAddress}>{destinationAddress}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors text-gray-600 dark:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative bg-gray-100 dark:bg-gray-900">
              {warningMsg && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-lg text-sm font-medium shadow-md w-[90%] md:w-auto text-center">
                      {warningMsg}
                  </div>
              )}

              {!isLoaded ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-medium">Loading Maps...</div>
              ) : errorMsg ? (
                <div className="absolute inset-0 flex items-center justify-center text-red-500 font-medium px-6 text-center bg-red-50/50 dark:bg-red-900/10">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30">
                        {errorMsg}
                    </div>
                </div>
              ) : currentLocation ? (
                <GoogleMap
                  mapContainerStyle={containerStyle}
                  center={currentLocation}
                  zoom={12}
                  onLoad={(map) => {
                    mapRef.current = map;
                  }}
                  options={{
                      disableDefaultUI: true,
                      zoomControl: true,
                  }}
                >
                  {directions ? (
                    <DirectionsRenderer
                      directions={directions}
                      options={{
                        suppressMarkers: false,
                        polylineOptions: {
                          strokeColor: "#4F46E5",
                          strokeWeight: 6,
                          strokeOpacity: 0.8,
                        },
                      }}
                    />
                  ) : destinationLatLng ? (
                    <>
                       {/* Import Marker from @react-google-maps/api at top to use this if needed, 
                           but DirectionsRenderer handles valid routing. For fallback markers:
                       */}
                       <Marker position={currentLocation} label="You" />
                       <Marker position={destinationLatLng} label="Product" />
                    </>
                  ) : null}
                </GoogleMap>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 font-medium gap-3">
                    <div className="w-8 h-8 border-4 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
                    Waiting for GPS location...
                </div>
              )}
            </div>

            {/* Footer / Instructions */}
            {directions && directions.routes[0]?.legs[0] && (
               <div className="p-4 px-6 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shrink-0">
                   <div className="flex justify-between items-center text-gray-800 dark:text-gray-200">
                        <div className="flex items-center gap-4">
                            <div className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 p-3 rounded-xl font-bold text-xl">
                                {directions.routes[0].legs[0].duration?.text}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100 text-lg">{directions.routes[0].legs[0].distance?.text}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Fastest route now</p>
                            </div>
                        </div>
                   </div>
               </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
