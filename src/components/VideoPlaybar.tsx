import React, { useState, useEffect, useRef } from "react";
import { Slider } from "@/components/ui/slider";

interface VideoPlaybarProps {
  isPlaying: boolean;
  videoSrc: string;
  onPlayPause: () => void;
}

const VideoPlaybar: React.FC<VideoPlaybarProps> = ({
  isPlaying,
  videoSrc,
  onPlayPause,
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // Create a hidden video element to track time
  useEffect(() => {
    const video = document.createElement("video");
    video.src = videoSrc;
    video.style.display = "none";
    video.addEventListener("loadedmetadata", () => {
      setDuration(video.duration);
    });
    document.body.appendChild(video);
    videoRef.current = video;

    return () => {
      if (videoRef.current) {
        document.body.removeChild(videoRef.current);
      }
    };
  }, [videoSrc]);

  // Get the main playing video element
  const getPlayingVideo = (): HTMLVideoElement | null => {
    return document.querySelector(".clip-video") as HTMLVideoElement;
  };

  // Format time as MM:SS.ms
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 100);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
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
          } else if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
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
      }
    };

    if (playingVideo) {
      playingVideo.addEventListener("seeked", handleSeeked);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (playingVideo) {
        playingVideo.removeEventListener("seeked", handleSeeked);
      }
    };
  }, [isDragging, isPlaying]);

  const handleSliderChange = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);

    // Update both the hidden and visible videos
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }

    const playingVideo = getPlayingVideo();
    if (playingVideo) {
      playingVideo.currentTime = newTime;
    }
  };

  // Handle scrubbing with improved performance
  const handleScrubStart = () => {
    setIsDragging(true);
    // Pause video while scrubbing for smoother experience
    const playingVideo = getPlayingVideo();
    if (playingVideo && isPlaying) {
      playingVideo.pause();
    }
  };

  const handleScrubEnd = () => {
    setIsDragging(false);
    // Resume playback if it was playing before
    const playingVideo = getPlayingVideo();
    if (playingVideo && isPlaying) {
      playingVideo
        .play()
        .catch((err) => console.error("Error resuming video:", err));
    }
  };

  return (
    <div className="bg-black/60 backdrop-blur-sm rounded-full p-2 flex items-center gap-2">
      <div className="text-xs text-white w-14 text-center">
        {formatTime(currentTime)}
      </div>
      <div className="flex-1">
        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 100}
          step={0.001} // Increased precision for smoother scrubbing
          onValueChange={handleSliderChange}
          onValueCommit={handleScrubEnd}
          onPointerDown={handleScrubStart}
          className="cursor-pointer"
        />
      </div>
      <div className="text-xs text-white w-14 text-center">
        {formatTime(duration)}
      </div>
    </div>
  );
};

export default VideoPlaybar;
