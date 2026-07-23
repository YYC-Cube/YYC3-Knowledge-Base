"use client"

import type React from "react"
import { createContext, useContext, useState, useRef, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

type SoundType = "click" | "hover" | "success" | "error" | "notification"

interface SoundContextType {
  isEnabled: boolean
  volume: number
  playSound: (type: SoundType) => void
  toggleSound: () => void
  setVolume: (volume: number) => void
}

const SoundContext = createContext<SoundContextType | null>(null)

export function useSound() {
  const context = useContext(SoundContext)
  if (!context) {
    // Return default values instead of throwing error
    return {
      isEnabled: false,
      volume: 0.5,
      playSound: () => {},
      toggleSound: () => {},
      setVolume: () => {},
    }
  }
  return context
}

interface SoundProviderProps {
  children: ReactNode
  defaultEnabled?: boolean
  defaultVolume?: number
}

export function SoundProvider({ children, defaultEnabled = true, defaultVolume = 0.5 }: SoundProviderProps) {
  const [isEnabled, setIsEnabled] = useState(defaultEnabled)
  const [volume, setVolumeState] = useState(defaultVolume)
  const audioContextRef = useRef<AudioContext | null>(null)

  // 初始化音频上下文
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (error) {
        console.warn("Web Audio API not supported:", error)
        return null
      }
    }
    return audioContextRef.current
  }

  // 生成不同类型的音效
  const generateTone = (frequency: number, duration: number, type: OscillatorType = "sine") => {
    const audioContext = getAudioContext()
    if (!audioContext || !isEnabled) return

    try {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
      oscillator.type = type

      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(volume * 0.1, audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
    } catch (error) {
      console.warn("Error playing sound:", error)
    }
  }

  const playSound = (type: SoundType) => {
    if (!isEnabled || !type) return

    switch (type) {
      case "click":
        generateTone(800, 0.1, "square")
        break
      case "hover":
        generateTone(600, 0.05, "sine")
        break
      case "success":
        // 成功音效：上升音调
        setTimeout(() => generateTone(523, 0.1), 0) // C5
        setTimeout(() => generateTone(659, 0.1), 100) // E5
        setTimeout(() => generateTone(784, 0.2), 200) // G5
        break
      case "error":
        // 错误音效：下降音调
        generateTone(400, 0.3, "sawtooth")
        break
      case "notification":
        // 通知音效：双音调
        generateTone(800, 0.1)
        setTimeout(() => generateTone(600, 0.1), 150)
        break
      default:
        generateTone(440, 0.1)
    }
  }

  const toggleSound = () => {
    setIsEnabled(!isEnabled)
  }

  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    setVolumeState(clampedVolume)
  }

  return (
    <SoundContext.Provider
      value={{
        isEnabled,
        volume,
        playSound,
        toggleSound,
        setVolume,
      }}
    >
      {children}
    </SoundContext.Provider>
  )
}

// 带音效的按钮组件
interface SoundButtonProps extends React.ComponentProps<typeof Button> {
  soundType?: SoundType
  enableHoverSound?: boolean
}

export function SoundButton({
  children,
  soundType = "click",
  enableHoverSound = true,
  onClick,
  onMouseEnter,
  className,
  ...props
}: SoundButtonProps) {
  const { playSound } = useSound()

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    playSound(soundType)
    onClick?.(event)
  }

  const handleMouseEnter = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (enableHoverSound) {
      playSound("hover")
    }
    onMouseEnter?.(event)
  }

  return (
    <Button
      {...props}
      className={cn("transition-all duration-200", className)}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </Button>
  )
}

// 音效控制组件
export function SoundControls({ className }: { className?: string }) {
  const { isEnabled, volume, toggleSound, setVolume } = useSound()

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <SoundButton
        variant="ghost"
        size="sm"
        onClick={toggleSound}
        soundType="click"
        enableHoverSound={false}
        className="p-2"
        aria-label={isEnabled ? "关闭音效" : "开启音效"}
      >
        {isEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </SoundButton>

      {isEnabled && (
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => setVolume(Number.parseFloat(e.target.value))}
          className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          aria-label="音量控制"
        />
      )}
    </div>
  )
}

// 音效反馈Hook
export function useSoundFeedback() {
  const { playSound } = useSound()

  const playSuccess = () => playSound("success")
  const playError = () => playSound("error")
  const playNotification = () => playSound("notification")
  const playClick = () => playSound("click")

  return {
    playSuccess,
    playError,
    playNotification,
    playClick,
  }
}
