"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface CCTVModalProps {
  isOpen: boolean;
  onClose: () => void;
  cctv: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    streamUrl: string;
  } | null;
  allCCTVs?: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    streamUrl: string;
  }>;
  onCCTVChange?: (cctv: { id: string; name: string; lat: number; lng: number; streamUrl: string }) => void;
}

export default function CCTVModal({ isOpen, onClose, cctv, allCCTVs = [], onCCTVChange }: CCTVModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingProxy, setUsingProxy] = useState(false);

  // Get current CCTV index
  const currentIndex = allCCTVs.length > 0 && cctv
    ? allCCTVs.findIndex(c => c.id === cctv.id)
    : -1;

  // Navigation functions
  const goToPrevious = () => {
    if (currentIndex > 0 && onCCTVChange) {
      onCCTVChange(allCCTVs[currentIndex - 1]);
    }
  };

  const goToNext = () => {
    if (currentIndex < allCCTVs.length - 1 && onCCTVChange) {
      onCCTVChange(allCCTVs[currentIndex + 1]);
    }
  };

  // Clear error when CCTV changes
  useEffect(() => {
    setError(null);
    setLoading(true);
  }, [cctv?.id]);

  useEffect(() => {
    const abortController = new AbortController();

    const loadStream = async () => {
      if (!isOpen || !cctv || !videoRef.current) {
        return;
      }

      const video = videoRef.current;
      setError(null);
      setLoading(true);

      // Clean up previous HLS instance
      if ((video as any).hls) {
        (video as any).hls.stopLoad();
        (video as any).hls.destroy();
        delete (video as any).hls;
      }

      const streamUrl = cctv.streamUrl;

      // Check if streamUrl exists
      if (!streamUrl) {
        setError("No stream URL available for this CCTV.");
        setLoading(false);
        return;
      }

      // Check if the URL is a blob URL (not supported)
      if (streamUrl.startsWith("blob:")) {
        setError("Blob URLs are not supported. Please use a direct stream URL (HLS, MP4, etc.)");
        setLoading(false);
        return;
      }

      // Use proxy for external streams to bypass CORS
      // The atcs-dishub server has strict CORS policies
      // pelindung.bandung.go.id and cctv.bandungkab.go.id are handled by the proxy
      const proxiedUrl = streamUrl.startsWith("http")
        ? `/api/proxy-stream?url=${encodeURIComponent(streamUrl)}`
        : streamUrl;

      if (streamUrl.startsWith("http")) {
        setUsingProxy(true);
      } else {
        setUsingProxy(false);
      }

      // Pre-check if stream is available (for proxied URLs)
      if (streamUrl.startsWith("http")) {
        try {
          const checkResponse = await fetch(proxiedUrl, { signal: abortController.signal });

          const contentType = checkResponse.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const data = await checkResponse.json();
            if (data.error) {
              setError("📡 Stream not available - This CCTV is currently offline or the URL is invalid.");
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          if ((e as Error).name === 'AbortError') {
            return; // Component unmounted or modal closed
          }
          // Continue to load stream, pre-check failed
        }
      }

      // Try HLS.js for .m3u8 streams
    if (streamUrl.includes(".m3u8") || Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        // Set the base URL for resolving relative paths in the playlist
        // This ensures segments are loaded from the same origin as the m3u8 file
        xhrSetup: (xhr, url) => {
          // Check if the component has been unmounted before sending the request
          if (abortController.signal.aborted) {
            xhr.abort();
            return;
          }
          xhr.timeout = 15000; // 15 second timeout
          // Set withCredentials to false for cross-origin requests
          xhr.withCredentials = false;

          // Listen for abort signal
          abortController.signal.addEventListener('abort', () => {
            xhr.abort();
          });

          // Intercept response to check for JSON error from proxy
          const originalOnReadyStateChange = xhr.onreadystatechange;
          xhr.onreadystatechange = function(this: XMLHttpRequest, event: Event) {
            if (xhr.readyState === 4 && xhr.status === 200) {
              try {
                const contentType = xhr.getResponseHeader("content-type") || "";
                if (contentType.includes("application/json")) {
                  const response = JSON.parse(xhr.responseText);
                  if (response.error) {
                    // Trigger error with the proxy's message
                    if (response.status === 404 || response.error === "Stream not available") {
                      setError("📡 Stream not available - This CCTV is currently offline or the URL is invalid.");
                      setLoading(false);
                    }
                  }
                }
              } catch (e) {
                // Not JSON, continue normally
              }
            }
            if (originalOnReadyStateChange) {
              originalOnReadyStateChange.call(this, event);
            }
          };
        },
      });

      hls.loadSource(proxiedUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch((e) => {
          console.error("Autoplay failed:", e);
          setError("Click to play video (autoplay blocked by browser)");
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS error:", data);

        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setError(
              "Network error loading stream. The CCTV may be offline or experiencing connection issues. " +
              "Try opening the stream directly in a new tab."
            );
            setLoading(false);
          } else {
            setError("Failed to load stream. The stream URL may be invalid or offline.");
            setLoading(false);
          }
        }
      });

      (video as any).hls = hls;
    }
    // Native HLS support (Safari)
    else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = proxiedUrl;
      video.addEventListener("loadedmetadata", () => {
        setLoading(false);
        video.play().catch((e) => {
          console.error("Autoplay failed:", e);
        });
      });
      video.addEventListener("error", () => {
        setError("Failed to load stream. The CCTV may be offline.");
        setLoading(false);
      });
    }
    // Direct video file (MP4, etc.)
    else {
      video.src = proxiedUrl;
      video.addEventListener("loadeddata", () => {
        setLoading(false);
        video.play().catch((e) => {
          console.error("Autoplay failed:", e);
        });
      });
      video.addEventListener("error", () => {
        setError("Failed to load video. Check if the URL is correct.");
        setLoading(false);
      });
    }
    };

    loadStream();

    return () => {
      // Abort any ongoing fetch requests
      abortController.abort();

      // Properly cleanup HLS instance
      if (videoRef.current && (videoRef.current as any).hls) {
        const hls = (videoRef.current as any).hls;
        hls.stopLoad(); // Stop loading fragments
        hls.destroy(); // Destroy the instance
        delete (videoRef.current as any).hls;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
        videoRef.current.load(); // Reset media element
      }
    };
  }, [isOpen, cctv]);

  if (!isOpen || !cctv) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <div>
              <h2 className="text-lg font-semibold">{cctv.name}</h2>
              <p className="text-red-100 text-xs">
                {cctv.lat.toFixed(6)}, {cctv.lng.toFixed(6)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Previous/Next Navigation */}
            {allCCTVs.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  disabled={currentIndex <= 0}
                  className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1"
                  title="Previous CCTV"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Prev
                </button>
                <span className="text-sm opacity-80">
                  {currentIndex + 1} / {allCCTVs.length}
                </span>
                <button
                  onClick={goToNext}
                  disabled={currentIndex >= allCCTVs.length - 1}
                  className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1"
                  title="Next CCTV"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="w-px h-6 bg-white/30 mx-1"></div>
              </>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Video Container */}
        <div className="relative bg-black aspect-video">
          {error ? (
            // Stream Not Available Jumbotron
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center text-white p-8 max-w-lg">
                <div className="text-6xl mb-6">📡</div>
                <h3 className="text-2xl font-bold mb-3">
                  Stream Not Available
                </h3>
                <p className="text-gray-300 mb-6">{error}</p>
                <p className="text-gray-500 text-xs break-all mb-6 bg-gray-800 p-3 rounded">
                  {cctv.streamUrl}
                </p>
                <a
                  href={cctv.streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors mb-4"
                >
                  Open Stream in New Tab
                </a>
                <div className="text-xs text-gray-400 text-left bg-gray-800 p-4 rounded mt-4">
                  <p className="font-semibold mb-2">Note:</p>
                  <p>CCTV streams may be offline or experiencing network issues. Try opening the stream directly in a new tab, or select a different camera.</p>
                </div>
              </div>
            </div>
          ) : loading ? (
            // Loading Spinner
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Loading stream{usingProxy ? " via proxy..." : "..."}</p>
                {usingProxy && (
                  <p className="text-xs text-gray-400 mt-2">
                    Using CORS proxy to bypass restrictions
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {/* Video element - only rendered when no error */}
          {!error && (
            <video
              ref={videoRef}
              className="w-full h-full"
              controls
              playsInline
              muted
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Location:</span>{" "}
              <a
                href={`https://www.google.com/maps?q=${cctv.lat},${cctv.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Open in Google Maps
              </a>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
