import React, { useEffect, useState } from "react";
import { PLAYLIST_DETAILS_TRACKS, Song } from "../data/musicData";
import { Audio, AVPlaybackSource, AVPlaybackStatus } from "expo-av";

 interface AudioPlayerContextType {
    currentTrack: Song | null;
    isPlaying: boolean;
    positionMillis: number;
    durationMillis: number;
    playSong : (song:Song,playList : Song[]) => Promise<void>;
    togglePlayPause: () => Promise<void>;
    playPrevious: () => Promise<void>;
    playNext: () => Promise<void>;
    seekTo: (positionMillis: number) => Promise<void>;
}

const AudioPlayerContext = React.createContext<AudioPlayerContextType | undefined>(undefined);
export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [currentTrack, setCurrentTrack] = useState<Song | null>(PLAYLIST_DETAILS_TRACKS[0]);

    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    const [playlist, setPlaylist] = useState<Song[]>(PLAYLIST_DETAILS_TRACKS);

    const [positionMillis, setPositionMillis] = useState<number>(0);
    const [durationMillis, setDurationMillis] = useState<number>(1);
    
    useEffect(() => {
        Audio.setAudioModeAsync({
            staysActiveInBackground: true,
            playsInSilentModeIOS : true,
            shouldDuckAndroid: true,
        })
        return (() => {
         if(sound) {
            sound.unloadAsync();
         }
        });
    }, []);


    const onPlaybackStatusUpdate = (status : AVPlaybackStatus) => {
        if(status.isLoaded){
            setPositionMillis(status.positionMillis);
            setDurationMillis(status.durationMillis || 1);
            setIsPlaying(status.isPlaying);
            if(status.didJustFinish){
                playNext();
            }
        }
    }

    const playSong = async(song : Song,newPlaylist? : Song[]) => {
        try{
            if(sound) {
                await sound.unloadAsync();
            }
            setCurrentTrack(song);
            if(newPlaylist && newPlaylist.length > 0) {
                setPlaylist(newPlaylist);
            }
            const uri = song.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
            const {sound : newSound} = await Audio.Sound.createAsync({uri},{shouldPlay : true},onPlaybackStatusUpdate);
            setSound(newSound);
            setIsPlaying(true);
        }
        catch(error){
            console.error("Error playing song:", error);
        }
    }

    const togglePlayPause = async() => {
        if(!sound){
            if(currentTrack){
                await playSong(currentTrack);
            }
            return;
        }
        if(isPlaying){
            await sound.pauseAsync();
        }
        else{
            await sound.playAsync();
        }
    };

    const playNext = async() => {
        if(!currentTrack || playlist.length === 0 ) return;
        const currentIndex = playlist.findIndex((s) => s.id === currentTrack.id);
        const nextIndex = (currentIndex + 1) % playlist.length;
        await playSong(playlist[nextIndex],playlist);
    }

    const playPrevious = async () => {
        if(!currentTrack || playlist.length === 0) return;

        const currentIndex = playlist.findIndex((s) => s.id === currentTrack.id);
        const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
        await playSong(playlist[prevIndex]);
    }

    const seekTo = async (posMillis: number) => {
    if (sound) {
      await sound.setPositionAsync(posMillis);
    }
  };
    return(
        <AudioPlayerContext.Provider
        value={{
            currentTrack,
            isPlaying,
            positionMillis,
            durationMillis,
            playSong,
            togglePlayPause,
            playPrevious,
            playNext,
            seekTo
        }}
        >
            {children}
        </AudioPlayerContext.Provider>
    )
}

export const useAudioPlayer = () => {
    const context = React.useContext(AudioPlayerContext);
    if(!context){
        throw new Error("loi r cu")
    }
    return context;
}
