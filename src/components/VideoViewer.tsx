import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Share2, Trash2, Video, X } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface Clip {
  id: string;
  thumbnail: string;
  videoSrc: string;
  title: string;
}

export default function VideoViewer() {
  const [isLiveView, setIsLiveView] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [galleryHeight, setGalleryHeight] = useState(150); // Default height
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // Start with empty clips data
  const [clips, setClips] = useState<Clip[]>([]);
  const [attemptCounter, setAttemptCounter] = useState(1);

  // Calculate thumbnail height based on gallery height with memoization to reduce re-renders
  const thumbnailHeight = React.useMemo(() => {
    return Math.max(galleryHeight - 60, 60); // Minimum height of 60px
  }, [galleryHeight]);

  const handleThumbnailClick = (clip: Clip | null) => {
    if (clip === null) {
      setIsLiveView(true);
      setSelectedClip(null);
    } else {
      setIsLiveView(false);
      setSelectedClip(clip);
      // Keep the current playing state when switching clips
      // Force a re-render of the video element
      setTimeout(() => {
        const videoElement = document.querySelector(".clip-video");
        if (videoElement && isPlaying) {
          videoElement
            .play()
            .catch((err) => console.error("Error playing video:", err));
        }
      }, 100);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (isRecording) {
      // Simulate creating a new clip when stopping recording
      const newClip: Clip = {
        id: Date.now().toString(),
        thumbnail: `/Aerial - Still - Lenni - Attempt ${attemptCounter}.png`,
        videoSrc: "", // Empty string for now, will be a video path later
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
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=gymnast"
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
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              >
                <source
                  src="/Aerial - Input [Lenni, Realtime].mp4"
                  type="video/mp4"
                />
              </video>
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
                autoPlay={isPlaying}
                loop
                muted
                playsInline
                ref={(el) => {
                  if (el) {
                    isPlaying ? el.play() : el.pause();
                  }
                }}
              />
            ) : (
              <img
                src={selectedClip.thumbnail}
                alt={selectedClip.title}
                className="w-full h-full object-contain bg-black"
              />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <p className="text-zinc-500">No clip selected</p>
          </div>
        )}
      </div>
      {/* Playback controls - now overlaid on video */}
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
        <div className="h-full pt-6 pb-4 px-2">
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
                      className="w-full h-full object-cover flex opacity-100"
                      autoPlay
                      loop
                      muted
                      playsInline
                    >
                      <source
                        src="/Aerial - Input [Lenni, Realtime].mp4"
                        type="video/mp4"
                      />
                    </video>
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
                <CarouselItem className="basis-auto px-2 py-1" key={clip.id}>
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
        <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center gap-6 z-10">
          <button
            className={
              `p-3 rounded-full relative shadow-lg ${isRecording ? "" : "bg-black/60 backdrop-blur-sm hover:bg-black/70"}` +
              " bg-[#E92E67]"
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
          <button
            className={`p-3 rounded-full shadow-lg ${isLiveView ? "bg-zinc-600 cursor-not-allowed" : "bg-[#E92E67] hover:bg-[#d12a5e]"}`}
            onClick={() => {
              if (!isLiveView && selectedClip) {
                setIsPlaying(!isPlaying);
                // Only control the selected clip video if it exists
                if (selectedClip.videoSrc) {
                  const clipVideoElements =
                    document.querySelectorAll(".clip-video");
                  clipVideoElements.forEach((videoElement) => {
                    isPlaying ? videoElement.pause() : videoElement.play();
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
        </div>
      </div>
    </div>
  );
}
