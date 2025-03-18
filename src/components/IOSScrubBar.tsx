import React, { useState, useEffect, useRef } from "react";

interface IOSScrubBarProps {
  isPlaying: boolean;
  videoSrc: string;
  onPlayPause: () => void;
}

const IOSScrubBar: React.FC<IOSScrubBarProps> = ({
  isPlaying,
  videoSrc,
  onPlayPause,
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(0);
  const [tooltipTime, setTooltipTime] = useState(0);
  const [frameImages, setFrameImages] = useState<string[]>([]);
  const [dragStartX, setDragStartX] = useState(0);
  const [initialTranslateX, setInitialTranslateX] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const framesContainerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // Create a hidden video element to track time and extract frames
  useEffect(() => {
    const video = document.createElement("video");
    video.src = videoSrc;
    video.style.display = "none";
    video.addEventListener("loadedmetadata", () => {
      setDuration(video.duration);
      setCurrentTime(0); // Start at beginning
      generateFrameThumbnails(video);
    });
    document.body.appendChild(video);
    videoRef.current = video;

    return () => {
      if (videoRef.current) {
        document.body.removeChild(videoRef.current);
      }
    };
  }, [videoSrc]);

  // Generate frame thumbnails from the video
  const generateFrameThumbnails = async (video: HTMLVideoElement) => {
    const framesToExtract = 12; // Reduced number of frames to extract
    const frameGap = video.duration / framesToExtract;
    const frames: string[] = [];
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Get video dimensions
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // Set canvas size to match video aspect ratio (vertical)
    // For vertical videos, we want the height to be larger than width
    const frameHeight = 90; // Reduced height
    const frameWidth = Math.floor((videoWidth / videoHeight) * frameHeight);

    canvas.width = frameWidth;
    canvas.height = frameHeight;

    // Extract frames at regular intervals
    for (let i = 0; i < framesToExtract; i++) {
      const time = i * frameGap;
      video.currentTime = time;

      // Wait for the video to seek to the specified time
      await new Promise<void>((resolve) => {
        const seeked = () => {
          video.removeEventListener("seeked", seeked);
          resolve();
        };
        video.addEventListener("seeked", seeked);
      });

      // Draw the current frame to the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert the canvas to a data URL and add it to the frames array
      frames.push(canvas.toDataURL("image/jpeg", 0.7));
    }

    setFrameImages(frames);

    // Reset video to beginning and update frame position
    video.currentTime = 0;
    setCurrentTime(0);
    setTimeout(() => {
      // Make sure the video is paused at the beginning
      const playingVideo = getPlayingVideo();
      if (playingVideo) {
        playingVideo.currentTime = 0;
        playingVideo.pause();
      }
      // Update frame position after video is reset
      updateFramePosition(0);
    }, 100);
  };

  // Get the main playing video element
  const getPlayingVideo = (): HTMLVideoElement | null => {
    return document.querySelector(".clip-video") as HTMLVideoElement;
  };

  // Format time as MM:SS
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Update time using requestAnimationFrame for smoother updates
  useEffect(() => {
    if (!videoRef.current) return;

    const updateTimeWithRAF = (timestamp: number) => {
      // Throttle updates to every 16ms (roughly 60fps)
      if (timestamp - lastUpdateTimeRef.current >= 16) {
        lastUpdateTimeRef.current = timestamp;

        if (!isDragging) {
          const playingVideo = getPlayingVideo();
          if (playingVideo) {
            // Sync the hidden video with the playing video
            if (videoRef.current) {
              videoRef.current.currentTime = playingVideo.currentTime;
            }
            setCurrentTime(playingVideo.currentTime);
            updateFramePosition(playingVideo.currentTime);
          } else if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            updateFramePosition(videoRef.current.currentTime);
          }
        }
      }

      rafRef.current = requestAnimationFrame(updateTimeWithRAF);
    };

    // Start the animation frame loop
    rafRef.current = requestAnimationFrame(updateTimeWithRAF);

    // Set up event listener for the actual playing video for seeking events
    const playingVideo = getPlayingVideo();
    const handleSeeked = () => {
      if (playingVideo && !isDragging) {
        setCurrentTime(playingVideo.currentTime);
        updateFramePosition(playingVideo.currentTime);
      }
    };

    const handleTimeUpdate = () => {
      if (playingVideo && !isDragging) {
        setCurrentTime(playingVideo.currentTime);
        updateFramePosition(playingVideo.currentTime);
      }
    };

    if (playingVideo) {
      playingVideo.addEventListener("seeked", handleSeeked);
      playingVideo.addEventListener("timeupdate", handleTimeUpdate);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (playingVideo) {
        playingVideo.removeEventListener("seeked", handleSeeked);
        playingVideo.removeEventListener("timeupdate", handleTimeUpdate);
      }
    };
  }, [isDragging, isPlaying]);

  // Update the position of the frame strip based on current time
  const updateFramePosition = (time: number) => {
    if (
      !framesContainerRef.current ||
      !trackRef.current ||
      frameImages.length === 0
    )
      return;

    const trackWidth = trackRef.current.clientWidth;
    const frameContainerWidth = getFrameContainerWidth();
    const playheadPosition = trackWidth / 2; // Center of track where playhead is

    // Calculate the offset to position the current frame at the playhead
    const percentage = time / duration;

    // Calculate position based on percentage of video
    let offset;

    // Special handling for beginning of video
    if (time === 0 || percentage <= 0.01) {
      // At the beginning, position the strip so the left edge aligns with the playhead
      offset = 0;
    }
    // Special handling for end of video
    else if (time >= duration - 0.1 || percentage >= 0.99) {
      // At the end, position the strip so the right edge aligns with the playhead
      offset = frameContainerWidth - trackWidth;
    }
    // Normal case - position the current time frame at the playhead
    else {
      offset = percentage * frameContainerWidth - playheadPosition;
    }

    // Apply the transform
    framesContainerRef.current.style.transform = `translateX(${-offset}px)`;
  };

  // Get the total width of the frames container
  const getFrameContainerWidth = () => {
    if (frameImages.length === 0) return 0;

    // Get the first frame element to determine its width
    const frameElement = document.querySelector(".frame-thumbnail");
    if (!frameElement) return frameImages.length * 55; // Fallback width

    const frameWidth = frameElement.clientWidth;
    return frameImages.length * frameWidth;
  };

  // Handle frame strip drag start
  const handleFrameDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!framesContainerRef.current) return;

    setIsDragging(true);
    setDragStartX(e.clientX);

    // Get the current translateX value - this should be based on current time
    // instead of just the current transform to ensure we start from current position
    if (trackRef.current) {
      const trackWidth = trackRef.current.clientWidth;
      const frameContainerWidth = getFrameContainerWidth();
      const playheadPosition = trackWidth / 2;
      const percentage = currentTime / duration;

      // Calculate position based on percentage of video
      let offset;

      // Special handling for beginning of video
      if (currentTime === 0 || percentage <= 0.01) {
        // At the beginning, position the strip so the left edge aligns with the playhead
        offset = 0;
      }
      // Special handling for end of video
      else if (currentTime >= duration - 0.1 || percentage >= 0.99) {
        // At the end, position the strip so the right edge aligns with the playhead
        offset = frameContainerWidth - trackWidth;
      }
      // Normal case - position the current time frame at the playhead
      else {
        offset = percentage * frameContainerWidth - playheadPosition;
      }

      setInitialTranslateX(offset);

      // Update the frame position to match the current time
      framesContainerRef.current.style.transform = `translateX(${-offset}px)`;
    }

    // Store the current time to maintain position during drag
    const playingVideo = getPlayingVideo();
    if (playingVideo) {
      // Save the current time before pausing
      const currentVideoTime = playingVideo.currentTime;
      setCurrentTime(currentVideoTime);

      // Pause video while scrubbing for smoother experience
      if (isPlaying) {
        playingVideo.pause();
      }
    }

    document.addEventListener("mousemove", handleFrameDrag);
    document.addEventListener("mouseup", handleFrameDragEnd);

    // Prevent default to avoid selection issues
    e.preventDefault();
  };

  // Handle frame strip dragging
  const handleFrameDrag = (e: MouseEvent) => {
    if (!framesContainerRef.current || !trackRef.current) return;

    const deltaX = e.clientX - dragStartX;
    const newTranslateX = initialTranslateX - deltaX; // Invert delta for natural feeling

    const trackWidth = trackRef.current.clientWidth;
    const frameContainerWidth = getFrameContainerWidth();
    const playheadPosition = trackWidth / 2;

    // Calculate the minimum and maximum translate values
    // Min: left edge of first frame at left edge of track
    // Max: right edge of last frame at right edge of track
    const minTranslateX = 0;
    const maxTranslateX = frameContainerWidth - trackWidth;

    // Constrain the translation to keep frames within view
    const constrainedTranslateX = Math.max(
      minTranslateX,
      Math.min(newTranslateX, maxTranslateX),
    );

    // Update frame position
    framesContainerRef.current.style.transform = `translateX(${-constrainedTranslateX}px)`;

    // Calculate the time based on the position of the playhead relative to the frames
    // The playhead is fixed at the center of the track
    const framePositionAtPlayhead = constrainedTranslateX + playheadPosition;

    // Calculate percentage based on the frame position at the playhead
    let percentage = framePositionAtPlayhead / frameContainerWidth;

    // Clamp percentage between 0 and 1
    percentage = Math.max(0, Math.min(percentage, 1));

    const newTime = percentage * duration;

    // Update current time and tooltip
    setCurrentTime(newTime);
    setTooltipTime(newTime);
    setTooltipPosition(trackWidth / 2); // Center tooltip over playhead
    setShowTooltip(true);

    // Update the actual video time immediately for smoother scrubbing
    // Pass false to indicate this is not the end of dragging
    updateVideoTime(newTime, false);

    // Prevent default to avoid selection issues
    e.preventDefault();
  };

  // Handle frame strip drag end
  const handleFrameDragEnd = () => {
    setIsDragging(false);
    setShowTooltip(false);
    document.removeEventListener("mousemove", handleFrameDrag);
    document.removeEventListener("mouseup", handleFrameDragEnd);

    // Store the current time to ensure we maintain position
    const finalTime = currentTime;

    // Update video time and ensure it stays at the current position
    // Pass true to indicate this is the end of dragging
    updateVideoTime(finalTime, true);

    // Keep the frame position fixed at the current time
    updateFramePosition(finalTime);

    // Force a small delay to ensure the position is maintained
    setTimeout(() => {
      updateVideoTime(finalTime, true);
      updateFramePosition(finalTime);
    }, 50);

    // Add another delay with a longer timeout to ensure position is maintained
    setTimeout(() => {
      updateVideoTime(finalTime, true);
      updateFramePosition(finalTime);
    }, 200);

    // Add a final update with an even longer timeout to ensure position is maintained
    setTimeout(() => {
      updateVideoTime(finalTime, true);
      updateFramePosition(finalTime);

      // Force the video to stay at this position
      const playingVideo = getPlayingVideo();
      if (playingVideo) {
        playingVideo.currentTime = finalTime;
      }
    }, 500);
  };

  // Update the video time and ensure it stays at the correct position
  const updateVideoTime = (newTime: number, isEndOfDrag = false) => {
    // Update both the hidden and visible videos
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }

    const playingVideo = getPlayingVideo();
    if (playingVideo) {
      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        // Set the current time of the video
        playingVideo.currentTime = newTime;

        // Force a pause during dragging to ensure the video stays at the exact position
        if (isDragging) {
          playingVideo.pause();
        }
        // If not dragging and not playing, ensure it stays paused
        else if (!isPlaying && !isEndOfDrag) {
          playingVideo.pause();
        }

        // If this is the end of a drag operation, make sure we update the UI state
        if (isEndOfDrag) {
          // Update our state to match the final position
          setCurrentTime(newTime);

          // Force multiple updates to ensure the position is maintained
          const updatePosition = () => {
            if (playingVideo) {
              // Set the current time again to ensure it's maintained
              playingVideo.currentTime = newTime;

              // Update any other videos that might be playing
              const allVideoElements = document.querySelectorAll("video");
              allVideoElements.forEach((video) => {
                if (video !== playingVideo) {
                  video.currentTime = newTime;
                }
              });

              // Update frame position
              updateFramePosition(newTime);
            }
          };

          // Multiple updates with increasing delays to ensure position is maintained
          updatePosition();
          setTimeout(updatePosition, 50);
          setTimeout(updatePosition, 150);
          setTimeout(updatePosition, 300);

          // If it was playing before the drag, resume playback from the new position
          if (isPlaying) {
            // Add a delay before playing to ensure the time is set
            setTimeout(() => {
              if (playingVideo) {
                playingVideo
                  .play()
                  .catch((err) => console.error("Error resuming video:", err));
              }
            }, 350);
          }
        }
      });
    }
  };

  return (
    <div className="w-full flex flex-col gap-1">
      {/* Time indicators */}
      <div className="flex justify-between text-xs text-white/70 px-1 mb-1">
        <div>{formatTime(currentTime)}</div>
        <div>{formatTime(duration)}</div>
      </div>

      {/* Frame-based scrub bar */}
      <div
        className="relative h-16 flex items-center cursor-grab overflow-hidden rounded-md bg-black/30 backdrop-blur-sm"
        ref={trackRef}
      >
        {/* Frames container - draggable */}
        <div
          ref={framesContainerRef}
          className="absolute h-full flex touch-none select-none"
          style={{
            width:
              frameImages.length > 0 ? `${frameImages.length * 55}px` : "100%",
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
          onMouseDown={handleFrameDragStart}
        >
          {frameImages.length > 0
            ? frameImages.map((frame, index) => (
                <div
                  key={index}
                  className="h-full flex-shrink-0 frame-thumbnail"
                  style={{ width: "55px" }}
                >
                  <img
                    src={frame}
                    alt={`Frame ${index}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))
            : // Placeholder frames if real frames aren't loaded yet
              Array.from({ length: 12 }).map((_, index) => (
                <div
                  key={index}
                  className="h-full flex-shrink-0 bg-zinc-800 frame-thumbnail"
                  style={{ width: "55px" }}
                ></div>
              ))}
        </div>

        {/* Center playhead - fixed in center */}
        <div className="absolute left-1/2 h-full w-0.5 bg-[#E92E67] z-10 transform -translate-x-1/2 pointer-events-none">
          {/* Playhead handle */}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-[#E92E67] rounded-full"></div>
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-[#E92E67] rounded-full"></div>
        </div>

        {/* Time tooltip */}
        {showTooltip && (
          <div
            className="absolute -top-8 bg-black/80 text-white text-xs px-2 py-1 rounded transform -translate-x-1/2 pointer-events-none"
            style={{ left: `${tooltipPosition}px` }}
          >
            {formatTime(tooltipTime)}
          </div>
        )}
      </div>
    </div>
  );
};

export default IOSScrubBar;
