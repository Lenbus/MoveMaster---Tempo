import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Share2, Trash2, Video, X } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import IOSScrubBar from "./IOSScrubBar";

interface Clip {
  id: string;
  thumbnail: string;
  videoSrc: string;
  title: string;
}

export default function VideoViewer() {
  const [isLiveView, setIsLiveView] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [galleryHeight, setGalleryHeight] = useState(150); // Default height
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  const [sessionTitle, setSessionTitle] = useState("Session >");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const galleryRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // Initialize with empty clips array
  const [clips, setClips] = useState<Clip[]>([]);
  const [attemptCounter, setAttemptCounter] = useState(1);

  // Calculate thumbnail height based on gallery height with memoization to reduce re-renders
  const thumbnailHeight = React.useMemo(() => {
    return Math.max(galleryHeight - 60, 60); // Minimum height of 60px
  }, [galleryHeight]);

  // Keep track of live video time to prevent restarting
  const liveVideoTimeRef = useRef<number>(0);
  const thumbnailVideoRef = useRef<HTMLVideoElement>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);

  const handleThumbnailClick = (clip: Clip | null) => {
    if (clip === null) {
      // Switch to live view without resetting the video
      setIsLiveView(true);
      setSelectedClip(null);

      // We'll handle syncing in the useEffect to avoid restarting videos
    } else {
      // Save current time of live view before switching away
      if (mainVideoRef.current) {
        liveVideoTimeRef.current = mainVideoRef.current.currentTime;
      }

      setIsLiveView(false);
      setSelectedClip(clip);
      // Set to pause mode when switching clips
      setIsPlaying(false);

      // Force a re-render of the video element
      setTimeout(() => {
        const videoElement = document.querySelector(
          ".clip-video",
        ) as HTMLVideoElement;
        if (videoElement) {
          // Don't reset to beginning, just pause
          videoElement.pause();
          // Ensure the scrub bar is updated to show the current position
          const event = new Event("seeked");
          videoElement.dispatchEvent(event);
        }
      }, 100);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (isRecording) {
      // Create a new clip when stopping recording
      const newClip: Clip = {
        id: Date.now().toString(),
        thumbnail: `/Aerial - Still - Lenni - Attempt ${attemptCounter}.png`,
        videoSrc:
          attemptCounter <= 3
            ? `/Aerial - Input - Attempt ${attemptCounter}.mp4`
            : "",
        title: `Attempt ${attemptCounter}`,
      };
      // Add new clip at the beginning of the array (after live view)
      setClips([newClip, ...clips]);

      // Increment the attempt counter, reset to 1 if we reach 5
      setAttemptCounter((prev) => (prev >= 5 ? 1 : prev + 1));
    }
  };

  const deleteClip = (id: string) => {
    setClips(clips.filter((clip) => clip.id !== id));
    if (selectedClip?.id === id) {
      setSelectedClip(null);
      setIsLiveView(true);
    }
  };

  const closeViewer = () => {
    setSelectedClip(null);
    setIsLiveView(true);
  };

  // Handle drag start
  const handleDragStart = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    setIsDragging(true);
    if ("touches" in e) {
      setStartY(e.touches[0].clientY);
    } else {
      setStartY(e.clientY);
    }
    setStartHeight(galleryHeight);

    // Prevent default to avoid selection issues
    e.preventDefault();

    // Add a class to the body to prevent text selection during dragging
    document.body.classList.add("resizing");
  };

  // Handle drag move
  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;

    let clientY: number;
    if ("touches" in e) {
      clientY = e.touches[0].clientY;
    } else {
      clientY = e.clientY;
    }

    const deltaY = startY - clientY;

    // Use requestAnimationFrame for smoother animation
    requestAnimationFrame(() => {
      const newHeight = Math.min(
        Math.max(startHeight + deltaY, 100),
        window.innerHeight * 0.4,
      );
      setGalleryHeight(newHeight);
    });

    // Prevent default to avoid selection issues
    e.preventDefault();
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);

    // Remove the class from the body
    document.body.classList.remove("resizing");
  };

  // Add and remove event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("touchmove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchend", handleDragEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging, startY, startHeight]);

  // Save current time of live videos when switching away
  useEffect(() => {
    if (!isLiveView) {
      if (mainVideoRef.current) {
        liveVideoTimeRef.current = mainVideoRef.current.currentTime;
      }
    }
  }, [isLiveView]);

  // Sync live view videos when returning to live view
  useEffect(() => {
    if (isLiveView) {
      const syncLiveVideos = () => {
        // Use the thumbnail video as the source of truth
        if (thumbnailVideoRef.current && mainVideoRef.current) {
          // Sync main video to thumbnail video
          mainVideoRef.current.currentTime =
            thumbnailVideoRef.current.currentTime;
        }
      };

      // Initial sync - get time from thumbnail
      syncLiveVideos();

      // Set up interval for continuous sync
      const syncInterval = setInterval(syncLiveVideos, 1000);

      return () => clearInterval(syncInterval);
    }
  }, [isLiveView]);

  return (
    <div className="flex flex-col h-screen text-white opacity-100 bg-black">
      {/* Main video viewer */}
      <div className="flex-1 relative bg-zinc-900 flex items-center justify-center overflow-hidden">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
          {/* Close button */}
          <button
            onClick={closeViewer}
            className="p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-800 shadow-md"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Center content with user profile and clip title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#E92E67] p-0.5 shadow-md">
              <div className="w-full h-full rounded-full overflow-hidden">
                <img
                  src="/User Profile.png"
                  alt="User profile"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <span className="font-medium text-sm">
              {isLiveView
                ? "Live View"
                : selectedClip
                  ? selectedClip.title
                  : "No clip selected"}
            </span>
          </div>

          {/* Share button */}
          <button className="p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-800 shadow-md">
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {isLiveView ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="w-full h-full flex items-center justify-center">
              <video
                className="w-full h-full object-cover live-video-main"
                autoPlay
                muted
                playsInline
                src="/Aerial - Input [Lenni, Realtime].mp4"
                ref={mainVideoRef}
              ></video>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center z-[-1]">
              <Video className="w-24 h-24 text-zinc-600 opacity-20" />
              <p className="mt-4 text-zinc-500 opacity-20">Live Camera Feed</p>
            </div>
          </div>
        ) : selectedClip ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {selectedClip.videoSrc ? (
              <video
                className="w-full h-full object-cover clip-video"
                src={selectedClip.videoSrc}
                autoPlay={false}
                muted
                playsInline
                loop={isLooping}
                ref={(el) => {
                  if (el) {
                    // Always ensure video is paused initially
                    el.pause();
                    // Only play if isPlaying is true
                    if (isPlaying) el.play();
                  }
                }}
                onSeeked={(e) => {
                  // This event fires when the seeking operation completes
                  // We don't need to do anything here, but it helps with performance
                }}
                onEnded={() => {
                  // When video ends and not looping, pause it and reset isPlaying state
                  if (!isLooping) {
                    setIsPlaying(false);
                  }
                }}
              />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <img
                  src={selectedClip.thumbnail}
                  alt={selectedClip.title}
                  className="w-full h-auto object-contain"
                  style={{
                    objectFit: "cover",
                    width: "100%",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Video className="w-24 h-24 text-zinc-600 opacity-20" />
                  <p className="mt-4 text-zinc-500 opacity-20">
                    No video available
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <p className="text-zinc-500">No clip selected</p>
          </div>
        )}
      </div>
      {/* Resizable Thumbnail gallery */}
      <div
        ref={galleryRef}
        className="bg-zinc-900 rounded-t-3xl border-t border-zinc-800 relative will-change-transform will-change-contents select-none -mt-6"
        style={{
          height: `${galleryHeight}px`,
          transition: isDragging ? "none" : "height 0.2s ease-out",
        }}
      >
        {/* Drag handle */}
        <div
          ref={dragHandleRef}
          className="absolute top-0 left-0 right-0 h-6 cursor-ns-resize flex items-center justify-center z-10 touch-none select-none"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className="w-12 h-1 bg-zinc-700 rounded-full"></div>
        </div>
        <div className="h-full pt-10 pb-4 px-2">
          <Carousel className="w-full h-full py-[1] py-[1]">
            <CarouselContent className="h-full px-2">
              {/* Live view thumbnail */}
              <CarouselItem
                className="basis-auto relative px-2 py-1"
                key="live-view"
              >
                <div
                  className={`relative cursor-pointer ${isLiveView ? "ring-2 ring-[#E92E67]" : ""} rounded-lg overflow-hidden mx-1`}
                  onClick={() => handleThumbnailClick(null)}
                >
                  <div
                    className="bg-zinc-800 overflow-hidden rounded-lg"
                    style={{
                      height: `${thumbnailHeight}px`,
                      width: `${thumbnailHeight * 0.57}px`,
                    }}
                  >
                    <video
                      className="w-full h-full object-cover flex opacity-100 live-video-thumbnail"
                      autoPlay
                      muted
                      playsInline
                      src="/Aerial - Input [Lenni, Realtime].mp4"
                      ref={thumbnailVideoRef}
                    ></video>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Video className="w-8 h-8 text-zinc-600 opacity-50" />
                    </div>
                  </div>
                  <div className="absolute top-1 right-1 bg-[#E92E67] text-white px-1 rounded-full text-xs">
                    LIVE
                  </div>
                  {isRecording && (
                    <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-red-600 animate-pulse"></div>
                  )}
                </div>
                {/* Divider line */}
                <div
                  className="right-0 top-1/2 transform -translate-y-1/2 border-dotted border-zinc-600 h-1/4 absolute border-l-0 border-r-2 border-y-0 opacity-25"
                  style={{ height: `${thumbnailHeight / 3}px` }}
                />
              </CarouselItem>

              {/* Clip thumbnails */}
              {clips.map((clip) => (
                <CarouselItem className="basis-auto px-0.5 py-1" key={clip.id}>
                  <div
                    className={`relative cursor-pointer ${selectedClip?.id === clip.id ? "ring-2 ring-[#E92E67]" : ""} rounded-lg overflow-hidden mx-1`}
                    onClick={() => handleThumbnailClick(clip)}
                  >
                    <img
                      src={clip.thumbnail}
                      alt={clip.title}
                      className="object-cover rounded-lg"
                      style={{
                        height: `${thumbnailHeight}px`,
                        width: `${thumbnailHeight * 0.57}px`,
                      }}
                    />
                    <button
                      className="absolute top-0 right-0 bg-zinc-800 rounded-full p-1 hover:bg-zinc-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteClip(clip.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-zinc-400" />
                    </button>
                    {selectedClip?.id === clip.id && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full bg-[#E92E67]"></div>
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        {/* Session title - positioned above the gallery */}
        <div className="absolute top-2 left-0 px-4 z-10">
          <div
            className="text-sm text-white/80 font-medium cursor-pointer flex items-center"
            onClick={() => {
              setIsEditingTitle(true);
              setEditedTitle(sessionTitle);
            }}
          >
            <span>
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              - {sessionTitle}
            </span>
          </div>
        </div>

        {/* Title edit dialog */}
        {isEditingTitle && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-zinc-800 rounded-xl p-4 w-[90%] max-w-md">
              <h3 className="text-white font-medium mb-4">
                Edit Session Title
              </h3>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full bg-zinc-700 text-white rounded-md px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-[#E92E67]"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 rounded-md bg-zinc-700 text-white"
                  onClick={() => setIsEditingTitle(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-md bg-[#E92E67] text-white"
                  onClick={() => {
                    setSessionTitle(editedTitle);
                    setIsEditingTitle(false);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video controls and scrub bar - positioned above the card */}
        <div className="absolute -top-36 left-0 right-0 flex flex-col items-center gap-y-1 z-10">
          {/* Control buttons */}
          <div className="flex justify-center items-center gap-6 my-1.5">
            <button
              className={
                `p-3 rounded-full relative ${isRecording ? "" : "bg-black/60 backdrop-blur-sm hover:bg-black/70"}` +
                " bg-[#E92E67] shadow-2xl"
              }
              onClick={toggleRecording}
            >
              {isRecording && (
                <div className="absolute inset-0 rounded-full border-2 animate-ping border-[#E92E67]"></div>
              )}
              <div
                className={`w-4 h-4 rounded-full ${isRecording ? "bg-white animate-pulse" : "bg-[#E92E67]"}`}
              ></div>
            </button>
            <div className="flex items-center gap-2">
              <button
                className={
                  `p-3 rounded-full ${isLiveView ? "bg-zinc-600 cursor-not-allowed" : "bg-[#E92E67] hover:bg-[#d12a5e]"}` +
                  " shadow-2xl"
                }
                onClick={() => {
                  if (!isLiveView && selectedClip) {
                    setIsPlaying(!isPlaying);
                    // Only control the selected clip video if it exists
                    if (selectedClip.videoSrc) {
                      const clipVideoElements =
                        document.querySelectorAll(".clip-video");
                      clipVideoElements.forEach((videoElement: any) => {
                        if (isPlaying) {
                          videoElement.pause();
                        } else {
                          videoElement
                            .play()
                            .catch((err) =>
                              console.error("Error playing video:", err),
                            );
                        }
                      });
                    }
                  }
                }}
                disabled={isLiveView}
              >
                {isPlaying ? (
                  <Pause
                    fill="white"
                    className={`w-6 h-6 ${isLiveView ? "opacity-50" : ""}`}
                  />
                ) : (
                  <Play
                    fill="white"
                    className={`w-6 h-6 ${isLiveView ? "opacity-50" : ""}`}
                  />
                )}
              </button>

              {/* Loop toggle button */}
              <button
                className={
                  `p-2 rounded-full ${isLiveView ? "bg-zinc-600 cursor-not-allowed" : isLooping ? "bg-[#E92E67]" : "bg-black/60 backdrop-blur-sm"}` +
                  " shadow-lg"
                }
                onClick={() => {
                  if (!isLiveView && selectedClip) {
                    setIsLooping(!isLooping);
                    // Update loop attribute on video element
                    const clipVideoElements =
                      document.querySelectorAll(".clip-video");
                    clipVideoElements.forEach((videoElement: any) => {
                      videoElement.loop = !isLooping;
                    });
                  }
                }}
                disabled={isLiveView}
                title={isLooping ? "Disable loop" : "Enable loop"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`${isLiveView ? "opacity-50" : ""}`}
                >
                  <path d="M17 2l4 4-4 4" />
                  <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                  <path d="M7 22l-4-4 4-4" />
                  <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                </svg>
              </button>
            </div>
          </div>

          {/* Video scrub bar - positioned closer to controls */}
          {!isLiveView && selectedClip && selectedClip.videoSrc && (
            <div className="w-full px-4 mt-2 mb-1">
              <IOSScrubBar
                isPlaying={isPlaying}
                videoSrc={selectedClip.videoSrc}
                onPlayPause={() => {
                  if (!isLiveView && selectedClip) {
                    setIsPlaying(!isPlaying);
                    if (selectedClip.videoSrc) {
                      const clipVideoElements =
                        document.querySelectorAll(".clip-video");
                      clipVideoElements.forEach((videoElement: any) => {
                        if (isPlaying) {
                          videoElement.pause();
                        } else {
                          videoElement
                            .play()
                            .catch((err) =>
                              console.error("Error playing video:", err),
                            );
                        }
                      });
                    }
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
