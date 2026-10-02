"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  onError?: (cctvId: string, hasError: boolean) => void;
}

export default function CCTVModal({
  isOpen,
  onClose,
  cctv,
  allCCTVs = [],
  onCCTVChange,
  onError,
}: CCTVModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingProxy, setUsingProxy] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [updatingToken, setUpdatingToken] = useState(false);

  const handleSyncToken = async () => {
    setUpdatingToken(true);
    try {
      await fetch("/api/update-cctv", { method: "POST" });
      setError(null);
      setLoading(true);
    } catch {
      // ignore
    } finally {
      setUpdatingToken(false);
    }
  };

  // Wrapper function that calls both setError and onError
  const setErrorWithCallback = useCallback(
    (errorMsg: string | null) => {
      setError(errorMsg);
      if (cctv?.id && onError) {
        onError(cctv.id, errorMsg !== null);
      }
    },
    [cctv?.id, onError]
  );

  // Get current CCTV index
  const currentIndex =
    allCCTVs.length > 0 && cctv ? allCCTVs.findIndex((c) => c.id === cctv.id) : -1;

  // Navigation functions
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0 && onCCTVChange) {
      onCCTVChange(allCCTVs[currentIndex - 1]);
    }
  }, [currentIndex, onCCTVChange, allCCTVs]);

  const goToNext = useCallback(() => {
    if (currentIndex < allCCTVs.length - 1 && onCCTVChange) {
      onCCTVChange(allCCTVs[currentIndex + 1]);
    }
  }, [currentIndex, onCCTVChange, allCCTVs]);

  // Clear error when CCTV changes
  useEffect(() => {
    setErrorWithCallback(null);
    setLoading(true);
  }, [cctv?.id, setErrorWithCallback]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, goToPrevious, goToNext, onClose]);

  // Copy coordinates handler
  const copyCoordinates = () => {
    if (!cctv) return;
    const text = `${cctv.lat.toFixed(6)}, ${cctv.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  useEffect(() => {
    const abortController = new AbortController();
    const video = videoRef.current;

    const loadStream = async () => {
      if (!isOpen || !cctv || !video) {
        return;
      }

      setErrorWithCallback(null);
      setLoading(true);

      // Clean up previous HLS instance
      if ((video as any).hls) {
        (video as any).hls.stopLoad();
        (video as any).hls.destroy();
        delete (video as any).hls;
      }

      const streamUrl = cctv.streamUrl;

      if (!streamUrl) {
        setErrorWithCallback("No stream URL available for this CCTV.");
        setLoading(false);
        return;
      }

      if (streamUrl.startsWith("blob:")) {
        setErrorWithCallback("Blob URLs are not supported. Please use a direct stream URL.");
        setLoading(false);
        return;
      }

      const proxiedUrl = streamUrl.startsWith("http")
        ? `/api/proxy-stream?url=${encodeURIComponent(streamUrl)}`
        : streamUrl;

      setUsingProxy(streamUrl.startsWith("http"));

      if (streamUrl.startsWith("http")) {
        try {
          const checkResponse = await fetch(proxiedUrl, { signal: abortController.signal });
          const contentType = checkResponse.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const data = await checkResponse.json();
            if (data.error) {
              setErrorWithCallback("Stream offline or unavailable from ATCS Dishub server.");
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          if ((e as Error).name === "AbortError") {
            return;
          }
        }
      }

      // Try HLS.js for .m3u8 streams
      if (streamUrl.includes(".m3u8") || Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          xhrSetup: (xhr) => {
            if (abortController.signal.aborted) {
              xhr.abort();
              return;
            }
            xhr.timeout = 15000;
            xhr.withCredentials = false;

            abortController.signal.addEventListener("abort", () => {
              xhr.abort();
            });

            const originalOnReadyStateChange = xhr.onreadystatechange;
            xhr.onreadystatechange = function (this: XMLHttpRequest, event: Event) {
              if (xhr.readyState === 4 && xhr.status === 200) {
                try {
                  const contentType = xhr.getResponseHeader("content-type") || "";
                  if (contentType.includes("application/json")) {
                    const response = JSON.parse(xhr.responseText);
                    if (response.error) {
                      if (response.status === 404 || response.error === "Stream not available") {
                        setErrorWithCallback("CCTV is currently offline or unreachable.");
                        setLoading(false);
                      }
                    }
                  }
                } catch {
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
          video.play().catch(() => {
            setErrorWithCallback("Tap/click to play video (browser autoplay prevented)");
          });
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              setErrorWithCallback(
                "Network connection issue. The camera feed might be temporarily offline."
              );
              setLoading(false);
            } else {
              setErrorWithCallback("Failed to load stream. The feed may be unavailable.");
              setLoading(false);
            }
          }
        });

        (video as any).hls = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = proxiedUrl;
        video.addEventListener("loadedmetadata", () => {
          setLoading(false);
          video.play().catch(() => {});
        });
        video.addEventListener("error", () => {
          setErrorWithCallback("Failed to load stream. CCTV may be offline.");
          setLoading(false);
        });
      } else {
        video.src = proxiedUrl;
        video.addEventListener("loadeddata", () => {
          setLoading(false);
          video.play().catch(() => {});
        });
        video.addEventListener("error", () => {
          setErrorWithCallback("Video format not supported or URL unavailable.");
          setLoading(false);
        });
      }
    };

    loadStream();

    return () => {
      abortController.abort();
      if (video && (video as any).hls) {
        const hls = (video as any).hls;
        hls.stopLoad();
        hls.destroy();
        delete (video as any).hls;
      }
      if (video) {
        video.pause();
        video.src = "";
        video.load();
      }
    };
  }, [isOpen, cctv, setErrorWithCallback]);

  if (!isOpen || !cctv) return null;

  const isOnline = !error;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-zinc-950 text-zinc-100 rounded-2xl shadow-2xl border border-zinc-800/80 overflow-hidden flex flex-col transition-all transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            {/* Live Indicator */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="relative flex h-2.5 w-2.5">
                {isOnline && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isOnline ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
              </span>
              <span
                className={`text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                  isOnline
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}
              >
                {isOnline ? "Live" : "Offline"}
              </span>
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-semibold text-zinc-100 truncate" title={cctv.name}>
                {cctv.name}
              </h2>
              <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                <span>ATCS Dishub Bandung</span>
                <span>•</span>
                <span className="font-mono text-zinc-500">
                  {cctv.lat.toFixed(4)}, {cctv.lng.toFixed(4)}
                </span>
              </p>
            </div>
          </div>

          {/* Controls: Prev / Next / Close */}
          <div className="flex items-center gap-1.5 shrink-0 ml-4">
            {allCCTVs.length > 1 && (
              <div className="flex items-center bg-zinc-800/70 border border-zinc-700/60 rounded-lg p-0.5 text-xs text-zinc-300 mr-2">
                <button
                  onClick={goToPrevious}
                  disabled={currentIndex <= 0}
                  className="p-1.5 rounded hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Previous CCTV (←)"
                  aria-label="Previous CCTV"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="px-2 font-mono text-[11px] text-zinc-400">
                  {currentIndex + 1}/{allCCTVs.length}
                </span>
                <button
                  onClick={goToNext}
                  disabled={currentIndex >= allCCTVs.length - 1}
                  className="p-1.5 rounded hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Next CCTV (→)"
                  aria-label="Next CCTV"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-colors"
              title="Close (Esc)"
              aria-label="Close dialog"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Video Canvas Area */}
        <div className="relative bg-black aspect-video overflow-hidden">
          {/* Native video tag */}
          <video
            ref={videoRef}
            className={`w-full h-full object-contain ${error ? "hidden" : "block"}`}
            controls
            playsInline
            muted
            autoPlay
          />

          {error && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/90 p-8">
              <div className="text-center max-w-md mx-auto">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-2.829-2.829m0 0l2.829-2.829m-2.829 2.829L3 21M8.464 8.464a5 5 0 017.072 0M3 3l18 18" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-1.5">Kamera Sedang Offline</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-5">{error}</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      setError(null);
                      setLoading(true);
                    }}
                    className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Muat Ulang
                  </button>
                  <button
                    onClick={handleSyncToken}
                    disabled={updatingToken}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    title="Perbarui token stream CCTV"
                  >
                    <svg
                      className={`w-3.5 h-3.5 ${updatingToken ? "animate-spin" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{updatingToken ? "Sinkronisasi..." : "Update Token"}</span>
                  </button>
                  <a
                    href={cctv.streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span>Tab Baru</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          )}

          {!error && loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/85 p-8">
              <div className="text-center">
                <div className="relative w-12 h-12 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                </div>
                <p className="text-sm font-medium text-zinc-200">Menghubungkan ke CCTV...</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {usingProxy ? "Routing via ATCS proxy filter" : "Mengambil stream realtime"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer info & quick shortcuts */}
        <div className="px-5 py-3.5 bg-zinc-900/60 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={copyCoordinates}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50 transition-colors flex items-center gap-1.5"
              title="Salin koordinat"
            >
              <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{copiedCoords ? "Tersalin!" : "Salin Koordinat"}</span>
            </button>

            <a
              href={`https://www.google.com/maps?q=${cctv.lat},${cctv.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Google Maps</span>
            </a>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-zinc-500 text-[11px]">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">←</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">→</kbd>
              <span>Ganti CCTV</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">Esc</kbd>
              <span>Tutup</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
